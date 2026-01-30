'use client';

import { IMTProvider } from '@/context/IMTContext';
import { ControlPanel } from '@/components/ControlPanel';
import { TreeVisualization } from '@/components/TreeVisualization';

export default function Home() {
  return (
    <IMTProvider>
      <main className="flex h-screen overflow-hidden">
        <ControlPanel />
        <TreeVisualization />
      </main>
    </IMTProvider>
  );
}
