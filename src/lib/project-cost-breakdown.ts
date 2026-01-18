import type { AdditionalCost, Project, SupportedCurrency, TimeEntry, User } from '@/types/database';
import { convertFromAED, convertToAED, DEFAULT_EXCHANGE_RATES } from '@/lib/currency';

export interface ProjectCostBreakdown {
  additionalCostDisplay: number;
  userCostBreakdown: Array<{
    id: string;
    name: string;
    hours: number;
    costAed: number;
    costDisplay: number;
  }>;
}

export const buildProjectCostBreakdown = (
  project: (Project & {
    assigned_users: User[];
    time_entries: (TimeEntry & { users: User })[];
    additional_costs: AdditionalCost[];
  }) | null,
  projectCurrency: SupportedCurrency,
  additionalCostTotal: number,
  additionalCostAed: number,
): ProjectCostBreakdown => {
  const additionalCostDisplay = projectCurrency === 'AED'
    ? additionalCostTotal
    : convertFromAED(additionalCostAed, projectCurrency, DEFAULT_EXCHANGE_RATES[projectCurrency]);

  const userCostBreakdown = project?.assigned_users.map((member) => {
    const memberHours = project.time_entries
      .filter((entry) => entry.user_id === member.id)
      .reduce((sum, entry) => sum + entry.hours, 0);
    const rateCurrency = (member.hourly_rate_currency as SupportedCurrency) || 'AED';
    const hourlyRateAed = rateCurrency === 'AED'
      ? member.hourly_rate || 0
      : convertToAED(member.hourly_rate || 0, rateCurrency, DEFAULT_EXCHANGE_RATES[rateCurrency]);
    const costAed = memberHours * hourlyRateAed;
    const costDisplay = projectCurrency === 'AED'
      ? costAed
      : convertFromAED(costAed, projectCurrency, DEFAULT_EXCHANGE_RATES[projectCurrency]);
    return {
      id: member.id,
      name: member.full_name,
      hours: memberHours,
      costAed,
      costDisplay,
    };
  }) || [];

  return { additionalCostDisplay, userCostBreakdown };
};
