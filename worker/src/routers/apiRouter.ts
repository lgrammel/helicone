import { createClient } from "@supabase/supabase-js";
import { Env } from "..";
import { HeliconeHeaders } from "../lib/HeliconeHeaders";
import { RequestWrapper } from "../lib/RequestWrapper";
import { ClickhouseClientWrapper } from "../lib/db/clickhouse";
import { dbLoggableRequestFromAsyncLogModel } from "../lib/dbLogger/DBLoggable";
import { AsyncLogModel, validateAsyncLogModel } from "../lib/models/AsyncLog";
import { BaseRouter } from "./routerFactory";
import { InsertQueue } from "../lib/dbLogger/insertQueue";
import { Job as Job, isValidStatus, validateRun } from "../lib/models/Runs";
import { Database } from "../../supabase/database.types";
import { SupabaseWrapper } from "../lib/db/supabase";
import { Result, isErr } from "../results";
import { DBWrapper, HeliconeAuth } from "../db/DBWrapper";
import {
  HeliconeNode as HeliconeNode,
  validateHeliconeNode as validateHeliconeNode,
} from "../lib/models/Tasks";

class InternalResponse {
  constructor(private client: APIClient) {}

  newError(message: string, status: number): Response {
    console.error(`Response Error: `, message);
    return new Response(JSON.stringify({ error: message }), { status });
  }

  unauthorized(): Response {
    return this.newError("Unauthorized", 401);
  }
}

// TODO Move to API middleware so that it is always constructed

async function createAPIClient(env: Env, requestWrapper: RequestWrapper) {
  return new APIClient(env, requestWrapper, await requestWrapper.auth());
}
class APIClient {
  public queue: InsertQueue;
  public response: InternalResponse;
  private supabase: SupabaseWrapper;
  db: DBWrapper;
  private heliconeApiKeyRow?: Database["public"]["Tables"]["helicone_api_keys"]["Row"];

  constructor(
    private env: Env,
    private requestWrapper: RequestWrapper,
    auth: HeliconeAuth
  ) {
    this.response = new InternalResponse(this);
    this.supabase = new SupabaseWrapper(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.db = new DBWrapper(env, auth);
    this.queue = new InsertQueue(
      this.supabase.client,
      env.FALLBACK_QUEUE,
      env.REQUEST_AND_RESPONSE_QUEUE_KV
    );
  }
}

type Provider = "OPENAI" | "ANTHROPIC" | "CUSTOM";

async function logAsync(
  requestWrapper: RequestWrapper,
  env: Env,
  ctx: ExecutionContext,
  provider: Provider
): Promise<Response> {
  const asyncLogModel = await requestWrapper.getJson<AsyncLogModel>();
  // if payload is larger than 10MB, return 400
  const MAX_PAYLOAD_SIZE = 10 * 1024 * 1024;
  if (JSON.stringify(asyncLogModel).length > MAX_PAYLOAD_SIZE) {
    return new Response("Payload too large", { status: 400 });
  }
  if (!requestWrapper.getAuthorization()) {
    return new Response("Unauthorized", { status: 401 });
  }

  const [isValid, error] = validateAsyncLogModel(asyncLogModel);
  if (!isValid) {
    console.error("Invalid asyncLogModel", error);
    return new Response(JSON.stringify({ error }), { status: 400 });
  }

  const requestHeaders = new Headers(asyncLogModel.providerRequest.meta);
  const responseHeaders = new Headers(asyncLogModel.providerResponse.headers);
  const heliconeHeaders = new HeliconeHeaders(requestHeaders);

  const loggable = await dbLoggableRequestFromAsyncLogModel({
    requestWrapper,
    env,
    asyncLogModel,
    providerRequestHeaders: heliconeHeaders,
    providerResponseHeaders: responseHeaders,
    provider: provider,
  });
  const { error: logError } = await loggable.log(
    {
      clickhouse: new ClickhouseClientWrapper(env),
      supabase: createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY),
      dbWrapper: new DBWrapper(env, loggable.auth()),
      queue: new InsertQueue(
        createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY),
        env.FALLBACK_QUEUE,
        env.REQUEST_AND_RESPONSE_QUEUE_KV
      ),
    },
    env.RATE_LIMIT_KV
  );

  if (logError !== null) {
    return new Response(JSON.stringify({ error: logError }), {
      status: 200,
    });
  }

  return new Response("ok", { status: 200 });
}

export const getAPIRouter = (router: BaseRouter) => {
  router.post(
    "/job",
    async (
      _,
      requestWrapper: RequestWrapper,
      env: Env,
      ctx: ExecutionContext
    ) => {
      const client = await createAPIClient(env, requestWrapper);
      const authParams = await client.db.getAuthParams();
      if (authParams.error !== null) {
        return client.response.unauthorized();
      }
      const job = await requestWrapper.getJson<Job>();

      if (!job) {
        return new Response("Invalid run", { status: 400 });
      }
      const isValidRun = validateRun(job);

      if (isValidRun.error) {
        return client.response.newError(isValidRun.error, 400);
      }

      const { data, error } = await client.queue.addJob({
        custom_properties: job.customProperties ?? {},
        description: job.description ?? "",
        name: job.name ?? "",
        timeout_seconds: job.timeoutSeconds ?? 60,
        status: "PENDING",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        id: job.id ?? crypto.randomUUID(),
        org_id: authParams.data?.organizationId,
      });
      if (error) {
        return client.response.newError(error, 500);
      }
      return new Response(JSON.stringify({ data }), { status: 200 });
    }
  );

  router.patch(
    "/job/:id/status",
    async (
      { params: { id } },
      requestWrapper: RequestWrapper,
      env: Env,
      ctx: ExecutionContext
    ) => {
      const client = await createAPIClient(env, requestWrapper);
      const authParams = await client.db.getAuthParams();
      if (authParams.error !== null) {
        return client.response.unauthorized();
      }

      const { data: job, error: jobError } = await client.queue.getJobById(id);

      if (jobError) {
        return new Response(JSON.stringify({ error: jobError }), {
          status: 500,
        });
      }
      if (!job) {
        console.error("Run not found", id);
        return new Response(JSON.stringify({ error: "Run not found" }), {
          status: 404,
        });
      }

      if (job?.org_id !== authParams.data.organizationId) {
        return new Response("Unauthorized", { status: 401 });
      }
      const status =
        (await requestWrapper.getJson<{ status: string }>()).status ?? "";

      if (!isValidStatus(status)) {
        return client.response.newError("Invalid status", 400);
      }

      const { data, error } = await client.queue.updateRunStatus(id, status);
      if (error) {
        return client.response.newError(error, 500);
      }
      return new Response(JSON.stringify({ data }), { status: 200 });
    }
  );

  router.post(
    "/node",
    async (
      _,
      requestWrapper: RequestWrapper,
      env: Env,
      ctx: ExecutionContext
    ) => {
      const client = await createAPIClient(env, requestWrapper);
      const authParams = await client.db.getAuthParams();
      if (authParams.error !== null) {
        return client.response.unauthorized();
      }

      const node = await requestWrapper.getJson<HeliconeNode>();
      if (!node) {
        console.error("Content not JSON", node);
        return new Response("Invalid task", { status: 400 });
      }
      const isValidTask = validateHeliconeNode(node);

      if (isValidTask.error) {
        console.error("Invalid node Error", isValidTask);
        return new Response(JSON.stringify(isValidTask), {
          status: 400,
        });
      }

      const { data, error } = await client.queue.addTask(
        {
          custom_properties: node.customProperties ?? {},
          description: node.description ?? "",
          name: node.name ?? "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          id: node.id ?? crypto.randomUUID(),
          org_id: authParams.data.organizationId,
          job: node.job,
        },
        { parent_job_id: node.parentJobId }
      );
      if (error) {
        return client.response.newError(error, 500);
      }
      return new Response(JSON.stringify({ data }), { status: 200 });
    }
  );

  router.patch(
    "/node/:id/status",
    async (
      { params: { id } },
      requestWrapper: RequestWrapper,
      env: Env,
      ctx: ExecutionContext
    ) => {
      const client = await createAPIClient(env, requestWrapper);
      const authParams = await client.db.getAuthParams();
      if (authParams.error !== null) {
        return client.response.unauthorized();
      }

      const { data: job, error: jobError } = await client.queue.getJobById(id);

      if (jobError) {
        return new Response(JSON.stringify({ error: jobError }), {
          status: 500,
        });
      }
      if (!job) {
        console.error("Run not found", id);
        return new Response(JSON.stringify({ error: "Run not found" }), {
          status: 404,
        });
      }

      if (job?.org_id !== authParams.data.organizationId) {
        return new Response("Unauthorized", { status: 401 });
      }
      const status =
        (await requestWrapper.getJson<{ status: string }>()).status ?? "";

      if (!isValidStatus(status)) {
        return client.response.newError("Invalid status", 400);
      }

      const { data, error } = await client.queue.updateRunStatus(id, status);
      if (error) {
        return client.response.newError(error, 500);
      }
      return new Response(JSON.stringify({ data }), { status: 200 });
    }
  );

  router.post(
    "/custom/v1/log",
    async (
      _,
      requestWrapper: RequestWrapper,
      env: Env,
      ctx: ExecutionContext
    ) => {
      return await logAsync(requestWrapper, env, ctx, "CUSTOM");
    }
  );
  router.post(
    "/oai/v1/log",
    async (
      _,
      requestWrapper: RequestWrapper,
      env: Env,
      ctx: ExecutionContext
    ) => {
      return await logAsync(requestWrapper, env, ctx, "OPENAI");
    }
  );

  router.post(
    "/anthropic/v1/log",
    async (
      _,
      requestWrapper: RequestWrapper,
      env: Env,
      ctx: ExecutionContext
    ) => {
      return await logAsync(requestWrapper, env, ctx, "ANTHROPIC");
    }
  );

  // Proxy only + proxy forwarder
  router.all(
    "*",
    async (
      _,
      requestWrapper: RequestWrapper,
      env: Env,
      ctx: ExecutionContext
    ) => {
      return new Response("invalid path", { status: 400 });
    }
  );

  return router;
};
