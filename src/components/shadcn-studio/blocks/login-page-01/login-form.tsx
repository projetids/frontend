'use client'

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import { EyeOffIcon, EyeIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/auth-context'
import { ApiError } from '@/lib/api-client'
import { EMAIL_REGEX } from '@/lib/validation'

const LoginForm = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [isVisible, setIsVisible] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!EMAIL_REGEX.test(email) || password.length < 1) {
      toast.error('Formulaire incomplet', {
        description: 'Saisissez un e-mail valide et votre mot de passe.',
      })
      return
    }
    setLoading(true)
    try {
      await login({ user_mail: email, user_password: password })
      toast.success('Connexion réussie')
      navigate('/', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        // Throttle : 5 tentatives de login / 15 min / email
        const description =
          err.code === 'TOO_MANY_ATTEMPTS'
            ? 'Trop de tentatives. Patientez 15 minutes avant de réessayer.'
            : err.details || err.message
        toast.error('Échec de la connexion', { description })
      } else {
        toast.error('Échec de la connexion', { description: 'Erreur inattendue' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className='gap-4'>
        <Field className='gap-2'>
          <FieldLabel htmlFor='userMail' className='leading-5' required>
            Adresse e-mail
          </FieldLabel>
          <Input
            type='email'
            id='userMail'
            placeholder='Entrez votre adresse e-mail'
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete='email'
            required
          />
        </Field>
        <Field className='w-full gap-2'>
          <FieldLabel htmlFor='userPassword' className='leading-5' required>
            Mot de passe
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='userPassword'
              type={isVisible ? 'text' : 'password'}
              placeholder='••••••••••••••••'
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete='current-password'
              required
            />
            <InputGroupAddon align='inline-end' className='pr-1.5'>
              <Button
                variant='ghost'
                size='icon'
                type='button'
                onClick={() => setIsVisible(prevState => !prevState)}
                className='text-muted-foreground rounded-l-none hover:bg-transparent'
              >
                {isVisible ? <EyeOffIcon /> : <EyeIcon />}
                <span className='sr-only'>{isVisible ? 'Masquer' : 'Afficher'}</span>
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </Field>
        <div className='flex items-center justify-between gap-y-2'>
          <Link to='/forgot-password' className='text-base text-nowrap hover:underline'>
            Mot de passe oublié ?
          </Link>
        </div>
        <Field>
          <Button className='w-full' type='submit' disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}

export default LoginForm
