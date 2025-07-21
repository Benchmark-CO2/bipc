import { Check, ChevronsUpDown, Plus } from "lucide-react";
import * as React from "react";

import { getRecommendedUsers } from "@/actions/users/getRecommendedUsers";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";

interface IOption {
  value: string;
  label: string;
}
export function Combobox({ onChange }: { onChange?: (value: string) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [userEmail, setUserEmail] = React.useState("");
  const [usersList, setUsersList] = React.useState<IOption[]>([]);
  const { data } = useQuery({
    queryKey: ["users-suggestions"],
    queryFn: getRecommendedUsers,
  });

  React.useEffect(() => {
    if (data?.data.users) {
      const options = data.data.users.map((user) => ({
        value: user.email,
        label: user.name || user.email,
      }));
      setUsersList(options);
    } else {
      setUsersList([]);
    }
  }, [data]);

  const handleAddNewUser = () => {
    const newUser = { value: userEmail.trim(), label: userEmail.trim() };
    setUsersList((prev) => [...prev, newUser]);
    setValue(userEmail.trim());
    setUserEmail("");
    setOpen(false);
    if (onChange) {
      onChange(userEmail.trim());
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value
            ? usersList.find((user) => user.value === value)?.label
            : t("drawerInvite.nameOrEmailPlaceholder")}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput
            placeholder={t("drawerInvite.nameOrEmailPlaceholder")}
            className="h-9"
            onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
              setUserEmail(e.target.value)
            }
          />
          <CommandList>
            <CommandEmpty className="justify-start my-2">
              <Button
                variant={"outline"}
                className="text-left w-full"
                onClick={handleAddNewUser}
              >
                <Plus /> "{userEmail}"
              </Button>
            </CommandEmpty>
            <CommandGroup>
              {usersList.map((user) => (
                <CommandItem
                  key={user.value}
                  value={user.value}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? "" : currentValue);
                    setOpen(false);
                    if (onChange) {
                      onChange(currentValue === value ? "" : currentValue);
                    }
                  }}
                >
                  {user.label}
                  <Check
                    className={cn(
                      "ml-auto",
                      value === user.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
