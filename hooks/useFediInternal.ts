'use client';
import { useEffect, useState } from 'react';
import type { FediInternal } from '../lib/fedi-types';

type V2 = Extract<FediInternal, { version: 2 }>;

interface FediInternalHook {
  isAvailable: boolean;
  version: 0 | 1 | 2 | null;
  getInstalledMiniApps: V2['getInstalledMiniApps'] | null;
  installMiniApp: V2['installMiniApp'] | null;
}

const NULL_STATE: FediInternalHook = {
  isAvailable: false,
  version: null,
  getInstalledMiniApps: null,
  installMiniApp: null,
};

export function useFediInternal(): FediInternalHook {
  const [state, setState] = useState<FediInternalHook>(NULL_STATE);

  useEffect(() => {
    const fi = window.fediInternal;
    if (!fi) return;

    if (fi.version === 2) {
      setState({
        isAvailable: true,
        version: 2,
        getInstalledMiniApps: fi.getInstalledMiniApps.bind(fi),
        installMiniApp: fi.installMiniApp.bind(fi),
      });
    } else {
      setState({ isAvailable: true, version: fi.version, getInstalledMiniApps: null, installMiniApp: null });
    }
  }, []);

  return state;
}
