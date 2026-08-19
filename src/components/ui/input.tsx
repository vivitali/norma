import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
// `control` carries the 16px floor and `md:text-sm` is deliberately gone:
        // it would drop the control to 14px on desktop, which is the regression
        // the guard in globals.test.ts exists to prevent. 44px tall on phone,
        // 38px from `sm` -- the reference's own two heights.
        "control h-11 w-full min-w-0 rounded-md border border-input bg-card px-2.5 py-1 transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive sm:h-[38px]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
