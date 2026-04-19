import { api } from '@/lib/api'

const activeBootstrapRequests: Map<string, Promise<void>> = new Map<string, Promise<void>>()

export interface LinkedWebAccountSignInInput {
  readonly login: string
  readonly password: string
}

export const authApi = {
  async bootstrapTelegramSession({ initData }: { readonly initData: string }): Promise<void> {
    const activeRequest: Promise<void> | undefined = activeBootstrapRequests.get(initData)
    if (activeRequest) {
      await activeRequest
      return
    }
    const bootstrapRequest: Promise<void> = api
      .post('/auth/telegram/bootstrap', undefined, {
        headers: {
          Authorization: `tma ${initData}`,
        },
      })
      .then((): void => undefined)
      .finally((): void => {
        activeBootstrapRequests.delete(initData)
      })
    activeBootstrapRequests.set(initData, bootstrapRequest)
    await bootstrapRequest
  },
  async signInLinkedWebAccount(input: LinkedWebAccountSignInInput): Promise<void> {
    await api.post('/auth/web-account/sign-in', {
      login: input.login.trim(),
      password: input.password,
    })
  },
}
