import { useState } from "react";
import FilterBadge from "../../../../ui/filters/filterBadge";
import { TextInput } from "@tremor/react";
import { useRouter } from "next/router";

interface TextFilterBadgeProps {
  title: string;
  filterKey: string;
}

const TextFilterBadge = (props: TextFilterBadgeProps) => {
  const { title, filterKey } = props;

  const [value, setValue] = useState<string>("");

  const router = useRouter();

  return (
    <FilterBadge title={title}>
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between w-full text-sm space-x-2">
          <p className="flex w-[6rem]">{title} is</p>
          <TextInput
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (e.target.value === "") {
                const query = { ...router.query };
                delete query[filterKey];
                router.push({
                  pathname: router.pathname,
                  query,
                });
                return;
              } else {
                router.push({
                  pathname: router.pathname,
                  query: { ...router.query, [filterKey]: e.target.value },
                });
              }
            }}
          />
        </div>
      </div>
    </FilterBadge>
  );
};

export default TextFilterBadge;