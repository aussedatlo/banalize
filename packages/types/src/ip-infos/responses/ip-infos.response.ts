export type IpInfosResponse = {
  continent: {
    code: string;
    name: string;
  };
  country: {
    iso_code: string;
    name: string;
  };
  location: {
    accuracy_radius: number;
    latitude: number;
    longitude: number;
  };
};
