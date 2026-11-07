import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import Logo from '@/components/shadcn-studio/logo'
import { MThemeToggle } from '@/components/molecules'
import AuthBackgroundShape from '@/assets/svg/auth-background-shape'
import { Link } from 'react-router-dom'
import LoginForm from '@/components/shadcn-studio/blocks/login-page-01/login-form'

const Login = () => {
  return (
    <div className='relative flex h-auto min-h-screen items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8'>
      <div className='absolute top-4 right-4 z-10'>
        <MThemeToggle />
      </div>
      <div className='absolute'>
        <AuthBackgroundShape />
      </div>

      <Card className='z-1 w-full gap-6 py-6 sm:max-w-lg'>
        <CardHeader className='gap-6 px-6'>
          <Logo className='gap-3' />

          <div>
            <CardTitle className='mb-2 text-2xl font-semibold'>Connexion à IDS</CardTitle>
            <CardDescription className='text-base'>
              Accédez à votre espace de gestion du supermarché.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className='px-6'>

          <div className='space-y-4'>
            <LoginForm />

            <p className='text-muted-foreground text-center text-base'>
              Nouveau sur la plateforme ?{' '}
              <Link to='/register' className='text-card-foreground hover:underline'>
                Créer un compte
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Login