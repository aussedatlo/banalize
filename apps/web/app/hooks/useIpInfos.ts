"use client";

import { IpInfosResponse } from "@banalize/types";
import { useEffect, useState } from "react";

const EMPTY_IP_INFOS: Partial<IpInfosResponse> = {
  continent: undefined,
  country: undefined,
  location: undefined,
};

// In-memory cache object
const ipInfoCache: Record<string, Partial<IpInfosResponse>> = {};

export const useIpInfos = (ip: string) => {
  const [state, setState] = useState<Partial<IpInfosResponse>>(EMPTY_IP_INFOS);

  useEffect(() => {
    if (ipInfoCache[ip]) {
      setState(ipInfoCache[ip]);
    } else {
      setState(EMPTY_IP_INFOS);
      // If not cached, fetch from the API
      fetch(`/api/ip-infos/${ip}`)
        .then((response) => response.json())
        .then((data: Partial<IpInfosResponse>) => {
          // Store the result in the cache
          ipInfoCache[ip] = data;
          // Update the state with the fetched data
          setState(data);
        })
        .catch(() => {
          // Optionally handle errors
          setState(EMPTY_IP_INFOS);
        });
    }
  }, [ip]);

  return state;
};
