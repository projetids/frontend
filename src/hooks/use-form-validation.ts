import { useCallback, useMemo, useRef, useState } from "react"
import type { ChangeEvent, FormEvent } from "react"

// Hook générique de contrôle des champs de formulaire. Il centralise :
// - les valeurs et leur mise à jour (texte, textarea, select, checkbox) ;
// - les règles de validation par champ (une règle ou une liste de règles) ;
// - les erreurs, les champs « touchés » et le moment où valider ;
// - la soumission (validation avant d'appeler le callback).
//
// Il est volontairement indépendant de l'UI : chaque formulaire continue
// d'afficher `errors[champ]` dans son composant de champ habituel.

export type FormErrors<TValues> = Partial<Record<keyof TValues, string>>

/** Règle de validation d'un champ : renvoie un message ou `null`/`undefined`. */
export type FieldValidator<TValues, K extends keyof TValues> = (
  value: TValues[K],
  values: TValues
) => string | null | undefined

export type FormRules<TValues> = {
  [K in keyof TValues]?:
    FieldValidator<TValues, K> | ReadonlyArray<FieldValidator<TValues, K>>
}

export type UseFormValidationOptions<TValues extends Record<string, unknown>> =
  {
    /** Valeurs initiales (objet ou fabrique appelée une seule fois au montage). */
    initialValues: TValues | (() => TValues)
    /** Règles par champ. Un champ sans règle n'est jamais en erreur. */
    rules?: FormRules<TValues>
    /** Valide le champ à la perte de focus (défaut : true). */
    validateOnBlur?: boolean
    /** Efface l'erreur du champ dès qu'il est modifié (défaut : true). */
    clearErrorOnChange?: boolean
  }

export type FormSubmitHandler<TValues> = (
  values: TValues
) => void | Promise<void>

export type FormChangeEvent = ChangeEvent<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
>

type AnyValidator<TValues> = (
  value: TValues[keyof TValues],
  values: TValues
) => string | null | undefined

/** Vrai si au moins un champ porte une erreur. */
export function hasFormErrors(
  errors: Partial<Record<string, unknown>>
): boolean {
  return Object.values(errors).some(Boolean)
}

export function useFormValidation<TValues extends Record<string, unknown>>({
  initialValues,
  rules = {},
  validateOnBlur = true,
  clearErrorOnChange = true,
}: UseFormValidationOptions<TValues>) {
  const [values, setValuesState] = useState<TValues>(initialValues)
  const [errors, setErrorsState] = useState<FormErrors<TValues>>({})
  const [touched, setTouchedState] = useState<
    Partial<Record<keyof TValues, boolean>>
  >({})

  // Valeurs de référence pour les callbacks (évite les fermetures obsolètes).
  // Elles sont mises à jour dans les setters et `reset`, jamais pendant le rendu.
  const valuesRef = useRef(values)
  const initialValuesRef = useRef(values)

  const validatorsFor = useCallback(
    (field: keyof TValues): ReadonlyArray<AnyValidator<TValues>> => {
      const entry = rules[field]
      if (!entry) return []
      return (Array.isArray(entry) ? entry : [entry]) as ReadonlyArray<
        AnyValidator<TValues>
      >
    },
    [rules]
  )

  /** Exécute les règles d'un champ sans modifier l'état. */
  const checkField = useCallback(
    (field: keyof TValues, source: TValues): string | undefined => {
      for (const validator of validatorsFor(field)) {
        const message = validator(source[field], source)
        if (message) return message
      }
      return undefined
    },
    [validatorsFor]
  )

  /** Valide tous les champs et publie les erreurs. Retourne les erreurs. */
  const validate = useCallback(
    (source?: TValues): FormErrors<TValues> => {
      const target = source ?? valuesRef.current
      const nextErrors: FormErrors<TValues> = {}
      for (const field of Object.keys(rules) as Array<keyof TValues>) {
        const message = checkField(field, target)
        if (message) nextErrors[field] = message
      }
      setErrorsState(nextErrors)
      return nextErrors
    },
    [checkField, rules]
  )

  /** Valide un seul champ et met à jour son erreur. */
  const validateField = useCallback(
    (field: keyof TValues): string | undefined => {
      const message = checkField(field, valuesRef.current)
      setErrorsState((previous) => {
        const next = { ...previous }
        if (message) next[field] = message
        else delete next[field]
        return next
      })
      return message
    },
    [checkField]
  )

  /** Met à jour un champ typé. */
  const setFieldValue = useCallback(
    <K extends keyof TValues>(field: K, value: TValues[K]) => {
      const previous = valuesRef.current
      if (Object.is(previous[field], value)) return
      const next = { ...previous, [field]: value }
      // Mise à jour synchrone de la référence : `validate()` reste exact même
      // si plusieurs champs changent avant le prochain rendu.
      valuesRef.current = next
      setValuesState(next)

      if (clearErrorOnChange) {
        setErrorsState((previousErrors) => {
          if (!(field in previousErrors)) return previousErrors
          const nextErrors = { ...previousErrors }
          delete nextErrors[field]
          return nextErrors
        })
      }
    },
    [clearErrorOnChange]
  )

  /** Met à jour plusieurs champs (patch) ou tous les champs (fonction). */
  const setValues = useCallback(
    (patch: Partial<TValues> | ((previous: TValues) => TValues)) => {
      const previous = valuesRef.current
      const next =
        typeof patch === "function"
          ? patch(previous)
          : { ...previous, ...patch }
      valuesRef.current = next
      setValuesState(next)

      if (clearErrorOnChange) {
        // Même comportement que `setFieldValue` : une modification efface
        // l'erreur du ou des champs concernés. Avec une fonction, on ne cible
        // que les champs dont la valeur a réellement changé.
        const changedKeys =
          typeof patch === "function"
            ? (Object.keys(next) as Array<keyof TValues>).filter(
                (field) => !Object.is(previous[field], next[field])
              )
            : (Object.keys(patch) as Array<keyof TValues>)

        if (changedKeys.length > 0) {
          setErrorsState((previousErrors) => {
            let cleared = false
            const nextErrors = { ...previousErrors }
            for (const field of changedKeys) {
              if (field in nextErrors) {
                delete nextErrors[field]
                cleared = true
              }
            }
            return cleared ? nextErrors : previousErrors
          })
        }
      }
    },
    [clearErrorOnChange]
  )

  /** Handler prêt pour `<input>`, `<textarea>` et `<select>`. */
  const handleChange = useCallback(
    <K extends keyof TValues>(field: K) =>
      (event: FormChangeEvent) => {
        const target = event.target
        const isCheckbox =
          target instanceof HTMLInputElement && target.type === "checkbox"
        const nextValue = isCheckbox ? target.checked : target.value
        setFieldValue(field, nextValue as TValues[K])
      },
    [setFieldValue]
  )

  /** Handler de blur : marque le champ touché et le valide si activé. */
  const handleBlur = useCallback(
    <K extends keyof TValues>(field: K) =>
      () => {
        setTouchedState((previous) =>
          previous[field] ? previous : { ...previous, [field]: true }
        )
        if (!validateOnBlur) return
        validateField(field)
      },
    [validateField, validateOnBlur]
  )

  /** Publie des erreurs (utile pour les erreurs renvoyées par l'API). */
  const setErrors = useCallback(
    (
      next:
        | FormErrors<TValues>
        | ((previous: FormErrors<TValues>) => FormErrors<TValues>)
    ) => {
      setErrorsState((previous) =>
        typeof next === "function" ? next(previous) : next
      )
    },
    []
  )

  /** Ajoute ou retire l'erreur d'un champ. */
  const setFieldError = useCallback(
    (field: keyof TValues, message?: string) => {
      setErrorsState((previous) => {
        const next = { ...previous }
        if (message) next[field] = message
        else delete next[field]
        return next
      })
    },
    []
  )

  const clearErrors = useCallback(() => setErrorsState({}), [])

  /** Réinitialise valeurs, erreurs et champs touchés. */
  const reset = useCallback((nextValues?: TValues) => {
    const next = nextValues ?? initialValuesRef.current
    valuesRef.current = next
    setValuesState(next)
    setErrorsState({})
    setTouchedState({})
  }, [])

  /** Vrai si toutes les règles passent avec les valeurs courantes. */
  const isValid = useMemo(
    () =>
      (Object.keys(rules) as Array<keyof TValues>).every(
        (field) => !checkField(field, values)
      ),
    [checkField, rules, values]
  )

  /**
   * Handler de soumission : valide, puis appelle `onValid` avec les valeurs.
   * `onInvalid` reçoit les erreurs pour afficher un message global.
   */
  const handleSubmit = useCallback(
    (
      onValid: FormSubmitHandler<TValues>,
      onInvalid?: (errors: FormErrors<TValues>) => void
    ) =>
      (event?: FormEvent<HTMLFormElement>) => {
        event?.preventDefault()
        const nextErrors = validate()
        if (hasFormErrors(nextErrors)) {
          onInvalid?.(nextErrors)
          return
        }
        return onValid(valuesRef.current)
      },
    [validate]
  )

  return {
    values,
    errors,
    touched,
    isValid,
    setFieldValue,
    setValues,
    setErrors,
    setFieldError,
    clearErrors,
    handleChange,
    handleBlur,
    validate,
    validateField,
    reset,
    handleSubmit,
  }
}

export type UseFormValidationReturn<TValues extends Record<string, unknown>> =
  ReturnType<typeof useFormValidation<TValues>>
