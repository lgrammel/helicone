import { SupabaseClient } from "@supabase/supabase-js";
import EventEmitter from "events";
import { ProxyRequest } from "../ProxyRequest/mapper";
import { ClickhouseClientWrapper } from "../db/clickhouse";
import { ChatPrompt, Prompt } from "../promptFormater/prompt";
import { logRequest, readAndLogResponse } from "./logResponse";
import { logInClickhouse } from "./clickhouseLog";

export interface DBLoggableProps {
  response: {
    getResponseBody: () => Promise<string>;
    status: number;
    responseHeaders: Headers;
  };
  request: {
    requestId: string;
    userId?: string;
    heliconeApiKeyAuthHash?: string;
    providerApiKeyAuthHash?: string;
    promptId?: string;
    promptFormatter?: {
      prompt: Prompt | ChatPrompt;
      name: string;
    };
    startTime: Date;
    bodyText?: string;
    path: string;
    properties: Record<string, string>;
    isStream: boolean;
  };
}

export function dbLoggableRequestFromProxyRequest(
  proxyRequest: ProxyRequest
): DBLoggableProps["request"] {
  return {
    requestId: proxyRequest.requestId,
    heliconeApiKeyAuthHash: proxyRequest.heliconeAuthHash,
    providerApiKeyAuthHash: proxyRequest.providerAuthHash,
    promptId: proxyRequest.requestWrapper.heliconeHeaders.promptId ?? undefined,
    userId: proxyRequest.userId,
    promptFormatter:
      proxyRequest.formattedPrompt?.prompt && proxyRequest.formattedPrompt?.name
        ? {
            prompt: proxyRequest.formattedPrompt.prompt,
            name: proxyRequest.formattedPrompt.name,
          }
        : undefined,
    startTime: proxyRequest.startTime,
    bodyText: proxyRequest.bodyText ?? undefined,
    path: proxyRequest.requestWrapper.url.href,
    properties: proxyRequest.requestWrapper.heliconeProperties,
    isStream: proxyRequest.isStream,
  };
}

export class DBLoggable {
  private response: DBLoggableProps["response"];
  private request: DBLoggableProps["request"];
  constructor(props: DBLoggableProps) {
    this.response = props.response;
    this.request = props.request;
  }

  async log(db: {
    supabase: SupabaseClient;
    clickhouse: ClickhouseClientWrapper;
  }) {
    const requestResult = await logRequest(this.request, db.supabase);

    if (requestResult.data !== null) {
      const responseResult = await readAndLogResponse(
        this.response,
        this.request,
        db.supabase
      );

      if (responseResult.data !== null) {
        await logInClickhouse(
          requestResult.data.request,
          responseResult.data,
          requestResult.data.properties,
          db.clickhouse
        );
      }
    }
  }
}