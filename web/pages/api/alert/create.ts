import {
  HandlerWrapperOptions,
  withAuth,
} from "../../../lib/api/handlerWrappers";
import { Result } from "../../../lib/result";
import { supabaseServer } from "../../../lib/supabaseServer";
import { Database } from "../../../supabase/database.types";
import { validateAlertCreate } from "../../../services/lib/alert";
import { Permission } from "../../../services/lib/user";

async function handler({
  req,
  res,
  userData,
}: HandlerWrapperOptions<
  Result<Database["public"]["Tables"]["alert"]["Row"], string>
>) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed", data: null });
  }

  const { alert } = req.body as {
    alert: Database["public"]["Tables"]["alert"]["Insert"];
  };

  alert.org_id = userData.orgId;

  const { error } = validateAlertCreate(alert);

  if (error) {
    res.status(500).json({ error: error, data: null });
    return;
  }

  const { data: insertedAlert, error: insertError } = await supabaseServer
    .from("alert")
    .insert(alert)
    .select("*")
    .single();

  if (insertError) {
    res.status(500).json({ error: insertError.message, data: null });
    return;
  }

  res.status(200).json({ error: null, data: insertedAlert });
}

export default withAuth(handler, [Permission.MANAGE_KEYS]);
