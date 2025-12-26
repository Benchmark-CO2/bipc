import { masks } from "@/utils/masks";
import { ModuleFormInput } from "@/validators/moduleFormByType.validator";
import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Card, CardContent } from "../../ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../ui/form";
import { Input } from "../../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

interface ModuleFormRaftPilesFoundationProps {
  form: UseFormReturn<ModuleFormInput>;
}

const ModuleFormRaftPilesFoundation = ({
  form,
}: ModuleFormRaftPilesFoundationProps) => {
  const fckOptions = [20, 25, 30, 35, 40, 45];
  const [customFck, setCustomFck] = useState(false);

  const currentRaftFck = form.watch("raft.fck");
  const isCustomFck =
    customFck || (currentRaftFck && !fckOptions.includes(currentRaftFck));

  return (
    <div className="space-y-4">
      {/* Radier */}
      <h3 className="text-sm font-medium text-gray-900">Radier</h3>
      <Card className="border-2 border-blue-500">
        <CardContent className="space-y-4 pt-4">
          {/* Área e Espessura do Radier */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="raft.area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Área (m²) *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="0,00"
                      onChange={(e) => {
                        const maskedValue = masks.numeric(e.target.value);
                        field.onChange(maskedValue);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="raft.thickness"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Espessura (m) *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="0,00"
                      onChange={(e) => {
                        const maskedValue = masks.numeric(e.target.value);
                        field.onChange(maskedValue);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* FCK do Radier */}
          <div
            className={`grid gap-4 ${isCustomFck ? "grid-cols-2" : "grid-cols-1"}`}
          >
            <FormField
              control={form.control}
              name="raft.fck"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">FCK (MPa) *</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => {
                        if (value === "other") {
                          setCustomFck(true);
                          field.onChange(70);
                        } else {
                          setCustomFck(false);
                          field.onChange(Number(value));
                        }
                      }}
                      value={isCustomFck ? "other" : field.value?.toString()}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione FCK" />
                      </SelectTrigger>
                      <SelectContent>
                        {fckOptions.map((fck) => (
                          <SelectItem key={fck} value={fck.toString()}>
                            {fck}
                          </SelectItem>
                        ))}
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isCustomFck && (
              <FormField
                control={form.control}
                name="raft.fck"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Outro FCK (MPa)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="70"
                        {...field}
                        value={field.value?.toString() || ""}
                        onChange={(e) =>
                          field.onChange(
                            Number(masks.numeric(e.target.value)) || 0
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <div className="border-t border-gray-200 my-4"></div>

          {/* Aço do Radier */}
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 px-1">
              <FormLabel className="text-xs text-gray-500">Aço</FormLabel>
            </div>
            <div className="border border-gray-200 rounded-md p-3 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="raft.steel.mesh"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Telas (kg)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="0,00"
                          onChange={(e) => {
                            const maskedValue = masks.numeric(e.target.value);
                            field.onChange(maskedValue);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="raft.steel.ca50"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">CA50 (kg)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="0,00"
                          onChange={(e) => {
                            const maskedValue = masks.numeric(e.target.value);
                            field.onChange(maskedValue);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="raft.steel.ca60"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">CA60 (kg)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="0,00"
                          onChange={(e) => {
                            const maskedValue = masks.numeric(e.target.value);
                            field.onChange(maskedValue);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="raft.steel.cp190"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Cordoalha (kg)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="0,00"
                          onChange={(e) => {
                            const maskedValue = masks.numeric(e.target.value);
                            field.onChange(maskedValue);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estacas */}
      <h3 className="text-sm font-medium text-gray-900">Estacas</h3>
      <Card className="border-2 border-blue-500">
        <CardContent className="space-y-4 pt-4">
          {/* Volume das Estacas */}
          <FormField
            control={form.control}
            name="piles.volume"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">
                  Volume de concreto (m³)
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="0,00"
                    onChange={(e) => {
                      const maskedValue = masks.numeric(e.target.value);
                      field.onChange(maskedValue);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Aço das Estacas */}
          <div className="space-y-3">
            <FormLabel className="text-xs text-gray-700">Aço</FormLabel>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="piles.steel.ca50"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">CA50 (kg)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="0,00"
                        onChange={(e) => {
                          const maskedValue = masks.numeric(e.target.value);
                          field.onChange(maskedValue);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="piles.steel.ca60"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">CA60 (kg)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="0,00"
                        onChange={(e) => {
                          const maskedValue = masks.numeric(e.target.value);
                          field.onChange(maskedValue);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModuleFormRaftPilesFoundation;
