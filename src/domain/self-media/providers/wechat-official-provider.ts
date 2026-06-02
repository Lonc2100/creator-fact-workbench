export interface WechatOfficialConfig {
  appId: string;
  appSecret: string;
  accountId?: string;
}

export interface WechatAccessTokenResult {
  accessToken: string;
  expiresIn: number;
}

export interface WechatApiError {
  errcode?: number;
  errmsg?: string;
}

export interface WechatArticleSummaryRow {
  ref_date: string;
  msgid?: string;
  title?: string;
  int_page_read_user?: number;
  int_page_read_count?: number;
  ori_page_read_user?: number;
  ori_page_read_count?: number;
  share_user?: number;
  share_count?: number;
  add_to_fav_user?: number;
  add_to_fav_count?: number;
}

export interface WechatUserSummaryRow {
  ref_date: string;
  user_source?: number;
  new_user?: number;
  cancel_user?: number;
}

type FetchLike = typeof fetch;

function assertOk(payload: WechatApiError, action: string) {
  if (payload.errcode && payload.errcode !== 0) throw new Error(`${action} failed: ${payload.errcode} ${payload.errmsg ?? ""}`.trim());
}

async function readWechatJson<T>(response: Response, action: string): Promise<T> {
  const payload = (await response.json()) as T & WechatApiError;
  assertOk(payload, action);
  return payload;
}

export class WechatOfficialProvider {
  private readonly fetcher: FetchLike;

  constructor(private readonly config: WechatOfficialConfig, fetcher: FetchLike = fetch) {
    this.fetcher = fetcher;
  }

  async getAccessToken(): Promise<WechatAccessTokenResult> {
    const url = new URL("https://api.weixin.qq.com/cgi-bin/token");
    url.searchParams.set("grant_type", "client_credential");
    url.searchParams.set("appid", this.config.appId);
    url.searchParams.set("secret", this.config.appSecret);
    const response = await this.fetcher(url);
    const payload = await readWechatJson<{ access_token: string; expires_in: number }>(response, "wechat.get_access_token");
    return { accessToken: payload.access_token, expiresIn: payload.expires_in };
  }

  async getArticleSummary(accessToken: string, beginDate: string, endDate: string): Promise<WechatArticleSummaryRow[]> {
    return this.postDatacube<{ list?: WechatArticleSummaryRow[] }>(accessToken, "getarticlesummary", beginDate, endDate).then((payload) => payload.list ?? []);
  }

  async getUserSummary(accessToken: string, beginDate: string, endDate: string): Promise<WechatUserSummaryRow[]> {
    return this.postDatacube<{ list?: WechatUserSummaryRow[] }>(accessToken, "getusersummary", beginDate, endDate).then((payload) => payload.list ?? []);
  }

  private async postDatacube<T>(accessToken: string, endpoint: "getarticlesummary" | "getusercumulate" | "getusersummary", beginDate: string, endDate: string): Promise<T> {
    const url = new URL(`https://api.weixin.qq.com/datacube/${endpoint}`);
    url.searchParams.set("access_token", accessToken);
    const response = await this.fetcher(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ begin_date: beginDate, end_date: endDate })
    });
    return readWechatJson<T>(response, `wechat.${endpoint}`);
  }
}
