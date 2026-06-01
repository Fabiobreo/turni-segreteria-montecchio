"use client";

/**
 * ButtonLink — MUI Button che naviga con Next.js Link.
 * Serve perché in App Router non si può passare `component={Link}`
 * (una funzione) da un Server Component a un Client Component.
 */
import { forwardRef } from "react";
import NextLink from "next/link";
import MuiButton, { ButtonProps } from "@mui/material/Button";

type Props = ButtonProps & { href: string };

export const ButtonLink = forwardRef<HTMLAnchorElement, Props>(
  ({ href, ...props }, ref) => (
    <MuiButton component={NextLink} href={href} ref={ref} {...props} />
  )
);
ButtonLink.displayName = "ButtonLink";
