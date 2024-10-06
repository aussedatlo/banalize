import { TextInput as MantineInput, TextInputProps } from "@mantine/core";
import classes from "./TextInput.module.css";

export const TextInput = ({ ...props }: TextInputProps) => {
  return <MantineInput classNames={{ input: classes.input }} {...props} />;
};
