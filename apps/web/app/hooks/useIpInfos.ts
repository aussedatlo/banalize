import { IpInfosResponse } from "@banalize/types";
import { useEffect, useState } from "react";

const EMPTY_IP_INFOS: Partial<IpInfosResponse> = {
  continent: undefined,
  country: undefined,
  location: undefined,
};

export const useIpInfos = (ip: string) => {
  const [state, setState] = useState<Partial<IpInfosResponse>>(EMPTY_IP_INFOS);

  useEffect(() => {
    fetch(`/api/ip-infos/${ip}`)
      .then((response) => response.json())
      .then((data) => setState(data));
  }, [ip]);

  return state;
};
