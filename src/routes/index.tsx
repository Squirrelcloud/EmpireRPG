import { createFileRoute } from "@tanstack/react-router";
import { EmpireApp } from "@/components/empire/EmpireApp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <EmpireApp />;
}
