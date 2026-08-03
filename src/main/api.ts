// DeepSeek 余额 API 客户端
// 官方文档: https://api-docs.deepseek.com/api/get-user-balance

export interface BalanceInfo {
  currency: string; // CNY | USD
  total_balance: string;
  granted_balance: string;
  topped_up_balance: string;
}

export interface BalanceResponse {
  is_available: boolean;
  balance_infos: BalanceInfo[];
}

const BALANCE_URL = 'https://api.deepseek.com/user/balance';
const REQUEST_TIMEOUT_MS = 15_000;

export type ApiErrorKind = 'auth' | 'http' | 'network' | 'parse';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly kind: ApiErrorKind = 'http',
    public readonly status?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function fetchBalance(apiKey: string): Promise<BalanceResponse> {
  let res: Response;
  try {
    res = await fetch(BALANCE_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new ApiError('网络请求失败，请检查网络连接', 'network');
  }

  if (!res.ok) {
    if (res.status === 401) {
      throw new ApiError('API Key 无效或已过期', 'auth', 401);
    }
    throw new ApiError(`接口返回错误（HTTP ${res.status}）`, 'http', res.status);
  }

  try {
    const data = (await res.json()) as BalanceResponse;
    if (!data || !Array.isArray(data.balance_infos)) {
      throw new Error('unexpected shape');
    }
    return data;
  } catch {
    throw new ApiError('接口响应解析失败', 'parse');
  }
}
