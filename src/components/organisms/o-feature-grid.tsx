import { MFeatureCard, type MFeatureCardProps } from "@/components/molecules"

export type OFeatureGridProps = {
  features: MFeatureCardProps[]
  columns?: 2 | 3 | 4
}

const columnClass = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
} as const

export function OFeatureGrid({ features, columns = 3 }: OFeatureGridProps) {
  return (
    <div className={`grid gap-4 ${columnClass[columns]}`}>
      {features.map((feature) => (
        <MFeatureCard key={feature.title} {...feature} />
      ))}
    </div>
  )
}
