import { useState, type FormEvent, type ReactElement } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Navigate, useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { authApi } from '@/features/auth/auth-api'
import { useAuthSession } from '@/features/auth/auth-provider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { getApiErrorMessage } from '@/lib/api'

interface SignInFormState {
  readonly login: string
  readonly password: string
}

interface SignInFormErrors {
  readonly login?: string
  readonly password?: string
}

const LOGIN_PATTERN: RegExp = /^[A-Za-z0-9._-]+$/

export function SignInPage(): ReactElement {
  const authSession = useAuthSession()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [formState, setFormState] = useState<SignInFormState>({
    login: '',
    password: '',
  })
  const [formErrors, setFormErrors] = useState<SignInFormErrors>({})
  const signInMutation = useMutation({
    mutationFn: authApi.signInLinkedWebAccount,
    onSuccess: async (): Promise<void> => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['session'] }),
        queryClient.invalidateQueries({ queryKey: ['subscription'] }),
        queryClient.invalidateQueries({ queryKey: ['platform-policy'] }),
      ])
      navigate('/', { replace: true })
    },
  })
  if (authSession.status === 'authenticated') {
    return <Navigate replace to="/" />
  }

  const submitSignIn = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    const normalizedFormState: SignInFormState = {
      login: formState.login.trim(),
      password: formState.password,
    }
    const nextErrors: SignInFormErrors = validateSignInForm(normalizedFormState)
    setFormErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return
    }
    signInMutation.mutate(normalizedFormState)
  }

  return (
    <div className="mx-auto flex min-h-[56vh] w-full max-w-md flex-col justify-center">
      <Card>
        <CardHeader>
          <CardTitle>Sign in to Rezeis</CardTitle>
          <CardDescription>
            Use the linked web-account login you created from your Telegram session.
          </CardDescription>
        </CardHeader>
        <form onSubmit={submitSignIn} noValidate>
          <CardContent>
            <FieldGroup>
              <Field data-invalid={Boolean(formErrors.login)}>
                <FieldLabel htmlFor="linked-login">Linked login</FieldLabel>
                <Input
                  id="linked-login"
                  autoComplete="username"
                  value={formState.login}
                  aria-invalid={Boolean(formErrors.login)}
                  onChange={(event) => {
                    setFormState((currentState) => ({
                      ...currentState,
                      login: event.target.value,
                    }))
                  }}
                />
                <FieldDescription>Letters, numbers, dots, underscores, and hyphens are supported.</FieldDescription>
                <FieldError>{formErrors.login}</FieldError>
              </Field>
              <Field data-invalid={Boolean(formErrors.password)}>
                <FieldLabel htmlFor="linked-password">Password</FieldLabel>
                <Input
                  id="linked-password"
                  type="password"
                  autoComplete="current-password"
                  value={formState.password}
                  aria-invalid={Boolean(formErrors.password)}
                  onChange={(event) => {
                    setFormState((currentState) => ({
                      ...currentState,
                      password: event.target.value,
                    }))
                  }}
                />
                <FieldError>{formErrors.password}</FieldError>
              </Field>
              {signInMutation.isError && (
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertDescription>{getApiErrorMessage(signInMutation.error)}</AlertDescription>
                </Alert>
              )}
            </FieldGroup>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit" disabled={signInMutation.isPending}>
              {signInMutation.isPending ? 'Signing in...' : 'Sign in'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

function validateSignInForm(input: SignInFormState): SignInFormErrors {
  const errors: { login?: string; password?: string } = {}
  if (input.login.length < 3) {
    errors.login = 'Enter your linked login.'
  } else if (!LOGIN_PATTERN.test(input.login)) {
    errors.login = 'Use only letters, numbers, dots, underscores, or hyphens.'
  }
  if (input.password.length < 8) {
    errors.password = 'Enter your linked account password.'
  }
  return errors
}
