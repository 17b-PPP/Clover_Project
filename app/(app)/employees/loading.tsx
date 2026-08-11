import { Spinner } from "@/components/ui/Spinner";

export default function EmployeesLoading() {
  return (
    <div className="mx-auto flex max-w-6xl items-center justify-center px-8 py-24">
      <Spinner className="h-8 w-8" />
    </div>
  );
}
