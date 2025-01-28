import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from "class-validator";

export function IsCidrOrIp(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isCidrOrIp",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: string) {
          if (!Array.isArray(value)) return false;

          return value.every((item: string) => {
            const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
            const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;

            if (!ipRegex.test(item) && !cidrRegex.test(item)) {
              return false;
            }
            const parts = item.split("/")[0].split(".");
            if (
              !parts.every((part) => {
                const num = parseInt(part);
                return num >= 0 && num <= 255;
              })
            ) {
              return false;
            }
            if (cidrRegex.test(item)) {
              const cidr = parseInt(item.split("/")[1]);
              if (cidr < 0 || cidr > 32) {
                return false;
              }
            }

            return true;
          });
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must contain valid IPv4 addresses or CIDR notation networks`;
        },
      },
    });
  };
}
