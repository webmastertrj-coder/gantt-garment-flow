export interface DistributionConfig {
  distribution: string;
  total: number;
}

export const distributionConfig: Record<string, Record<string, DistributionConfig>> = {
  "1 color": {
    "XS-S-M-L-XL": { distribution: "3-4-4-4-3", total: 18 },
    "S-M-L-XL": { distribution: "5-4-4-5", total: 18 },
    "S-M-L": { distribution: "6-6-6", total: 18 },
    "XL-XXL-XXXL": { distribution: "6-6-6", total: 18 },
    "XL-XXL-3XL": { distribution: "6-6-6", total: 18 },
    "28-30-32-34-36": { distribution: "3-4-4-4-3", total: 18 },
    "28-30-32-34-36-40": { distribution: "3-3-3-3-3-3", total: 18 },
    "06-08-10-12-14": { distribution: "3-4-4-4-3", total: 18 },
    "14-16-18-20": { distribution: "5-4-4-5", total: 18 },
    "14-16-18-20-22": { distribution: "3-4-4-4-3", total: 18 },
    "ONE-SIZE": { distribution: "50", total: 50 }
  },
  "2 colores": {
    "XS-S-M-L-XL": { distribution: "2-4-8-4-2", total: 20 },
    "S-M-L-XL": { distribution: "4-6-6-4", total: 20 },
    "S-M-L": { distribution: "6-8-6", total: 20 },
    "XL-XXL-XXXL": { distribution: "6-8-6", total: 20 },
    "XL-XXL-3XL": { distribution: "6-8-6", total: 20 },
    "28-30-32-34-36": { distribution: "2-4-8-4-2", total: 20 },
    "28-30-32-34-36-40": { distribution: "2-4-4-4-4-2", total: 20 },
    "06-08-10-12-14": { distribution: "2-4-8-4-2", total: 20 },
    "14-16-18-20": { distribution: "4-6-6-4", total: 20 },
    "14-16-18-20-22": { distribution: "2-4-8-4-2", total: 20 },
    "ONE-SIZE": { distribution: "50-50", total: 100 }
  }
};

export function calculateDistribution(
  curva: string | undefined,
  cantidadColores: string | undefined
): DistributionConfig | null {
  if (!curva || !cantidadColores) {
    return null;
  }

  const config = distributionConfig[cantidadColores]?.[curva];
  return config || null;
}
