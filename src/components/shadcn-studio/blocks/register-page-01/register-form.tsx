'use client'

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import { EyeOffIcon, EyeIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/auth-context'
import { ApiError } from '@/lib/api-client'
import { validateEmail, validatePassword, validatePhone } from '@/lib/validation'

type Errors = Partial<{
  user_name: string
  user_mail: string
  user_phone: string
  user_password: string
  confirm: string
}>

const RegisterForm = () => {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [isVisible, setIsVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  // DTO API : user_name, user_mail, user_password, user_phone
  const [form, setForm] = useState({
    user_name: '',
    user_mail: '',
    user_phone: '',
    user_password: '',
    confirm: '',
  })

  const setField = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: event.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const nextErrors: Errors = {
      user_name: form.user_name.trim() ? undefined : 'Le nom est requis.',
      user_mail: validateEmail(form.user_mail) ?? undefined,
      user_phone: validatePhone(form.user_phone) ?? undefined,
      user_password: validatePassword(form.user_password) ?? undefined,
      confirm:
        form.confirm !== form.user_password
          ? 'Les mots de passe ne correspondent pas.'
          : undefined,
    }
    const hasErrors = Object.values(nextErrors).some(Boolean)
    setErrors(nextErrors)
    if (hasErrors) {
      toast.error('Formulaire incomplet', {
        description: 'Corrigez les champs signalés en rouge.',
      })
      return
    }

    setLoading(true)
    try {
      await register({
        user_name: form.user_name.trim(),
        user_mail: form.user_mail.trim().toLowerCase(),
        user_password: form.user_password,
        user_phone: form.user_phone.trim(),
      })
      toast.success('Utilisateur créé avec succès')
      navigate('/', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        // CONFLICT : email ou nom d'utilisateur déjà utilisé
        toast.error('Inscription refusée', {
          description:
            err.code === 'CONFLICT'
              ? 'Un compte existe déjà avec cet e-mail ou ce nom.'
              : err.details || err.message,
        })
      } else {
        toast.error('Inscription refusée', { description: 'Erreur inattendue' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className='gap-4'>
        <Field className='gap-2'>
          <FieldLabel htmlFor='userName' className='leading-5'>
            Nom complet*
          </FieldLabel>
          <Input
            id='userName'
            placeholder='Jean Dupont'
            value={form.user_name}
            onChange={setField('user_name')}
            aria-invalid={Boolean(errors.user_name)}
            required
          />
        </Field>
        <Field className='gap-2'>
          <FieldLabel htmlFor='registerMail' className='leading-5'>
            Adresse e-mail*
          </FieldLabel>
          <Input
            type='email'
            id='registerMail'
            placeholder='jean.dupont@exemple.mg'
            value={form.user_mail}
            onChange={setField('user_mail')}
            aria-invalid={Boolean(errors.user_mail)}
            required
          />
        </Field>
        <Field className='gap-2'>
          <FieldLabel htmlFor='userPhone' className='leading-5'>
            Téléphone*
          </FieldLabel>
          <Input
            id='userPhone'
            placeholder='+2250700000000'
            value={form.user_phone}
            onChange={setField('user_phone')}
            aria-invalid={Boolean(errors.user_phone)}
            required
          />
        </Field>
        <Field className='w-full gap-2'>
          <FieldLabel htmlFor='registerPassword' className='leading-5'>
            Mot de passe*
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='registerPassword'
              type={isVisible ? 'text' : 'password'}
              placeholder='••••••••••••••••'
              value={form.user_password}
              onChange={setField('user_password')}
              aria-invalid={Boolean(errors.user_password)}
              autoComplete='new-password'
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
        <Field className='w-full gap-2'>
          <FieldLabel htmlFor='registerConfirm' className='leading-5'>
            Confirmer le mot de passe*
          </FieldLabel>
          <Input
            id='registerConfirm'
            type='password'
            value={form.confirm}
            onChange={setField('confirm')}
            aria-invalid={Boolean(errors.confirm)}
            autoComplete='new-password'
            required
          />
        </Field>
        <Field className='gap-2'>
          {Object.entries(errors).map(([key, message]) =>
            message ? (
              <p key={key} className='text-destructive text-sm'>
                {message}
              </p>
            ) : null,
          )}
        </Field>
        <Field>
          <Button className='w-full' type='submit' disabled={loading}>
            {loading ? 'Création…' : 'Créer un compte'}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}

export default RegisterForm
