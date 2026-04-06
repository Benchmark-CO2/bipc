import { getTokenKey } from "@/actions/auth/token";
import { Check, Copy, RefreshCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export const GenerateApiKey = () => {
  const [apiKey, setApiKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const generateApiKey = async () => {
    setLoading(true);
    setCopied(false);
    try {
      const response = await getTokenKey();
      if (response?.data?.api_key) setApiKey(response.data.api_key);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopied(true);
      toast.info("Chave de API copiada para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        variant="link"
        className="p-0 h-auto no-underline"
        style={{ padding: 0 }}
        onClick={generateApiKey}
        disabled={loading}
      >
        {loading ? "Gerando..." : "Gerar nova chave de API"}
        <RefreshCcw
          className={`ml-1 size-4 ${loading ? "animate-spin" : ""}`}
        />
      </Button>

      {apiKey && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
            A chave de API é de visualização única. Copie-a agora, pois não será
            possível vê-la novamente.
          </p>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={apiKey}
              className="font-mono text-xs select-all"
            />
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={handleCopy}
              title="Copiar chave"
            >
              {copied ? (
                <Check className="size-4 text-green-500" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
