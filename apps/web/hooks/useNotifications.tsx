import { NotifierConfigDto } from "@banalize/types";
import { useCallback } from "react";

export const useNotifications = () => {
  const remove = useCallback(async (id: string) => {
    const res = await fetch(`/api/notifications/${id}`, {
      method: "DELETE",
    });

    return await res.json();
  }, []);

  const update = useCallback(async (id: string, dto: NotifierConfigDto) => {
    const res = await fetch(`/api/notifications/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...dto,
      }),
    });
    return await res.json();
  }, []);

  const create = useCallback(async (dto: NotifierConfigDto) => {
    const res = await fetch(`/api/notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...dto,
      }),
    });
    return await res.json();
  }, []);

  return { remove, update, create };
};
