import logoSvg from '@/assets/react.svg'

import { cn } from '@/lib/utils'

const Logo = ({ className }: { className?: string }) => {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <img src={logoSvg} className='size-8.5' alt='Logo' />
      <span className='text-xl font-bold'>shadcn/studio</span>
    </div>
  )
}

export default Logo