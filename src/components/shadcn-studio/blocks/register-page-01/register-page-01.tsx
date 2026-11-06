import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import Logo from '@/components/shadcn-studio/logo'
import AuthBackgroundShape from '@/assets/svg/auth-background-shape'
import RegisterForm from '@/components/shadcn-studio/blocks/register-page-01/register-form'
import { Link } from 'react-router-dom'

const Register = () => {
  return (
    <div className='relative flex h-auto min-h-screen items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8'>
      <div className='absolute'>
        <AuthBackgroundShape />
      </div>

      <Card className='z-1 w-full gap-6 py-6 sm:max-w-lg'>
        <CardHeader className='gap-6 px-6'>
          <Logo className='gap-3' />

          <div>
            <CardTitle className='mb-2 text-2xl font-semibold'>Créer un compte</CardTitle>
            <CardDescription className='text-base'>Rejoignez la plateforme IDS.</CardDescription>
          </div>
        </CardHeader>

        <CardContent className='px-6'>
          <div className='space-y-4'>
            <RegisterForm />

            <p className='text-muted-foreground text-center text-base'>
              Vous avez déjà un compte ?{' '}
              <Link to='/login' className='text-card-foreground hover:underline'>
                Se connecter
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Register