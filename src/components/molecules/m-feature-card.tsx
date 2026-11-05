import { AtomBadge, AtomIcon, type IconName } from "@/components/atoms"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export type MFeatureCardProps = {
  icon?: IconName
  title: string
  description: string
  badge?: string
}

export function MFeatureCard({
  icon,
  title,
  description,
  badge,
}: MFeatureCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon ? <AtomIcon name={icon} className="size-4 text-primary" /> : null}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {badge ? (
        <CardContent>
          <AtomBadge variant="secondary">{badge}</AtomBadge>
        </CardContent>
      ) : null}
    </Card>
  )
}
