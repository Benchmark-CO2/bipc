import { createContext, useContext, useState } from 'react';

type SummaryContextProps = {
  title: string;
  component: React.ReactNode;
}

type SummaryContextType = {
  isOpen: boolean
  toggleSummary: () => void
  context: SummaryContextProps | null
  setSummaryContext: (context: SummaryContextProps) => void
  isExpanded: boolean
  toggleExpanded: () => void
}

const SummaryContext = createContext<SummaryContextType | undefined>(undefined);

export const useSummary = () => {
  const context = useContext(SummaryContext);
  if (!context) {
    throw new Error('useSummary must be used within a SummaryProvider');
  }
  return context;
};

export const SummaryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState<SummaryContextProps | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const setSummaryContext = (context: SummaryContextProps) => {
    setContext(context);
  }
  const toggleSummary = () => {
    setIsOpen((prev) => !prev);
    if (isExpanded) {
      setIsExpanded(false);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
  };

  return (
    <SummaryContext.Provider
      value={{
        isOpen,
        toggleSummary,
        context,
        setSummaryContext,
        isExpanded,
        toggleExpanded
      }}
    >
      {children}
    </SummaryContext.Provider>
  );
};
