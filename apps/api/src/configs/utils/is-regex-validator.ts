import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

@ValidatorConstraint({ async: false })
class IsRegexConstraint implements ValidatorConstraintInterface {
  validate(value: string) {
    if (typeof value !== "string") {
      return false;
    }
    try {
      new RegExp(value.replace(/<IP>/g, ""));
      return true;
    } catch (e) {
      return false;
    }
  }

  defaultMessage() {
    return "The string is not a valid regular expression";
  }
}

export function IsRegex(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsRegexConstraint,
    });
  };
}
