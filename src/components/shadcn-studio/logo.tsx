import { AtomIcon } from '@/components/atoms'

import { cn } from '@/lib/utils'

const Logo = ({ className }: { className?: string }) => {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className='bg-primary/10 text-primary flex size-8.5 items-center justify-center rounded-lg'>
        <AtomIcon name='layers' className='size-5' />
      </span>
      <span className='flex flex-col leading-none'>
        <span className='text-xl font-bold'>IDS</span>
        <span className='text-muted-foreground text-xs'>
          Gestion de Supermarché
        </span>
      </span>
    </div>
  )
}

export default Logo
