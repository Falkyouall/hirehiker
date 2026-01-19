import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { SwaggerSpec, SwaggerEndpoint } from "@/db/schema"

interface SwaggerViewerProps {
  spec: SwaggerSpec
  className?: string
}

const methodColors: Record<string, { bg: string; text: string }> = {
  GET: { bg: "bg-green-100", text: "text-green-700" },
  POST: { bg: "bg-blue-100", text: "text-blue-700" },
  PUT: { bg: "bg-orange-100", text: "text-orange-700" },
  PATCH: { bg: "bg-yellow-100", text: "text-yellow-700" },
  DELETE: { bg: "bg-red-100", text: "text-red-700" },
}

function MethodBadge({ method }: { method: string }) {
  const colors = methodColors[method] || { bg: "bg-zinc-100", text: "text-zinc-700" }
  return (
    <span
      className={cn(
        "px-2 py-0.5 text-xs font-bold rounded uppercase min-w-[60px] text-center inline-block",
        colors.bg,
        colors.text
      )}
    >
      {method}
    </span>
  )
}

function EndpointItem({ endpoint }: { endpoint: SwaggerEndpoint }) {
  const [expanded, setExpanded] = React.useState(false)

  return (
    <div className="border border-zinc-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-zinc-50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-zinc-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-zinc-400 flex-shrink-0" />
        )}
        <MethodBadge method={endpoint.method} />
        <code className="text-sm font-mono text-zinc-700">{endpoint.path}</code>
        <span className="text-sm text-zinc-500 ml-auto truncate max-w-[200px]">
          {endpoint.summary}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-3 space-y-3">
          {endpoint.description && (
            <p className="text-sm text-zinc-600">{endpoint.description}</p>
          )}

          {endpoint.parameters && endpoint.parameters.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-2">
                Parameters
              </h4>
              <div className="space-y-1">
                {endpoint.parameters.map((param, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 text-sm bg-white rounded px-2 py-1.5"
                  >
                    <code className="font-mono text-zinc-800">{param.name}</code>
                    <span className="text-zinc-400">({param.in})</span>
                    <span className="text-zinc-500">{param.type}</span>
                    {param.required && (
                      <span className="text-red-500 text-xs">required</span>
                    )}
                    {param.description && (
                      <span className="text-zinc-500 ml-auto">
                        {param.description}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {endpoint.responseSchema && (
            <div>
              <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-2">
                Response
              </h4>
              <div className="bg-white rounded px-3 py-2">
                <code className="text-sm text-zinc-600">
                  {endpoint.responseSchema.type}
                </code>
                {endpoint.responseSchema.properties && (
                  <div className="mt-2 space-y-1 pl-4 border-l-2 border-zinc-200">
                    {Object.entries(endpoint.responseSchema.properties).map(
                      ([key, value]) => (
                        <div key={key} className="text-sm">
                          <code className="font-mono text-zinc-800">{key}</code>
                          <span className="text-zinc-400 mx-1">:</span>
                          <span className="text-zinc-500">{value.type}</span>
                          {value.description && (
                            <span className="text-zinc-400 ml-2 text-xs">
                              // {value.description}
                            </span>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SwaggerViewer({ spec, className }: SwaggerViewerProps) {
  return (
    <div className={cn("space-y-2 p-4", className)}>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-zinc-700">{spec.title}</h3>
        <span className="text-xs text-zinc-400">v{spec.version}</span>
        <code className="text-xs bg-zinc-100 px-2 py-0.5 rounded text-zinc-600 ml-auto">
          {spec.baseUrl}
        </code>
      </div>

      <div className="space-y-2">
        {spec.endpoints.map((endpoint, idx) => (
          <EndpointItem key={`${endpoint.method}-${endpoint.path}-${idx}`} endpoint={endpoint} />
        ))}
      </div>
    </div>
  )
}

export { SwaggerViewer }
