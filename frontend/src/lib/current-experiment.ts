import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CurrentExperimentState {
  currentExperimentId: string | null
  setCurrentExperimentId: (id: string | null) => void
}

/** The experiment id most recently selected on the Experiments page, shared across stage pages. */
export const useCurrentExperimentStore = create<CurrentExperimentState>()(
  persist(
    (set) => ({
      currentExperimentId: null,
      setCurrentExperimentId: (id) => set({ currentExperimentId: id }),
    }),
    { name: 'radioflow.currentExperimentId' },
  ),
)
