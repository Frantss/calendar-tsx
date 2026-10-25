export type Calendar_ResourceExpansion = Readonly<Record<string, boolean>>;

export type Calendar_ResourceExpansionConfig = { initiallyExpanded?: boolean };

export type Calendar_ResourceExpansionApi = {
  setExpanded: (resourceId: string, expanded: boolean) => void;
  toggle: (resourceId: string) => void;
};
