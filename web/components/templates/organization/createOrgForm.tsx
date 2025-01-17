import { RadioGroup } from "@headlessui/react";
import {
  BuildingOfficeIcon,
  CakeIcon,
  CloudIcon,
  CommandLineIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { useState } from "react";
import { Database } from "../../../supabase/database.types";
import { clsx } from "../../shared/clsx";
import { useOrg } from "../../shared/layout/organizationContext";
import useNotification from "../../shared/notification/useNotification";
import { DEMO_EMAIL } from "../../../lib/constants";
import { COMPANY_SIZES } from "../welcome/steps/createOrg";

export const ORGANIZATION_COLORS = [
  {
    name: "gray",
    bgColor: "bg-gray-200",
    textColor: "text-gray-800",
    selectedColor: "ring-gray-500",
  },
  {
    name: "red",
    bgColor: "bg-red-300",
    textColor: "text-red-800",
    selectedColor: "ring-red-500",
  },
  {
    name: "yellow",
    bgColor: "bg-yellow-200",
    textColor: "text-yellow-800",
    selectedColor: "ring-yellow-500",
  },
  {
    name: "green",
    bgColor: "bg-green-300",
    textColor: "text-green-800",
    selectedColor: "ring-green-500",
  },
  {
    name: "blue",
    bgColor: "bg-blue-300",
    textColor: "text-blue-800",
    selectedColor: "ring-blue-500",
  },
  {
    name: "purple",
    bgColor: "bg-purple-300",
    textColor: "text-purple-800",
    selectedColor: "ring-purple-500",
  },
];

type OrgIconType = {
  name: "building" | "cake" | "cloud" | "rocket" | "code";
  icon: React.ForwardRefExoticComponent<
    React.SVGProps<SVGSVGElement> & {
      title?: string | undefined;
      titleId?: string | undefined;
    }
  >;
};

export const ORGANIZATION_ICONS: OrgIconType[] = [
  {
    name: "building",
    icon: BuildingOfficeIcon,
  },
  {
    name: "cake",
    icon: CakeIcon,
  },
  {
    name: "cloud",
    icon: CloudIcon,
  },
  {
    name: "rocket",
    icon: RocketLaunchIcon,
  },
  {
    name: "code",
    icon: CommandLineIcon,
  },
];

interface CreateOrgFormProps {
  variant?: "organization" | "reseller";
  onCancelHandler?: (open: boolean) => void;
  initialValues?: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
  };
  onSuccess?: () => void;
}

const CreateOrgForm = (props: CreateOrgFormProps) => {
  const {
    variant = "organization",
    onCancelHandler,
    initialValues,
    onSuccess,
  } = props;

  const [orgName, setOrgName] = useState(initialValues?.name || "");
  const [selectedColor, setSelectedColor] = useState(
    initialValues?.color
      ? ORGANIZATION_COLORS.find((c) => c.name === initialValues.color) ||
          ORGANIZATION_COLORS[0]
      : ORGANIZATION_COLORS[0]
  );
  const [selectedIcon, setSelectedIcon] = useState(
    initialValues?.icon
      ? ORGANIZATION_ICONS.find((i) => i.name === initialValues.icon) ||
          ORGANIZATION_ICONS[0]
      : ORGANIZATION_ICONS[0]
  );
  const [orgSize, setOrgSize] = useState("");

  const user = useUser();
  const orgContext = useOrg();
  const { setNotification } = useNotification();
  const supabaseClient = useSupabaseClient<Database>();

  return (
    <div className="flex flex-col gap-4 w-full space-y-8">
      {initialValues || variant === "reseller" ? (
        <></>
      ) : (
        <p className="font-semibold text-lg text-gray-900 dark:text-gray-100">
          Create New Organization
        </p>
      )}
      <div className="space-y-1.5 text-sm">
        <label
          htmlFor="org-name"
          className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100"
        >
          {
            {
              organization: "Organization Name",
              reseller: "Customer Name",
            }[variant]
          }
        </label>
        <input
          type="text"
          name="org-name"
          id="org-name"
          value={orgName}
          className="bg-gray-50 dark:bg-gray-950 text-black dark:text-white block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-600 text-sm lg:text-md lg:leading-6"
          placeholder={
            variant === "organization"
              ? "Your shiny new org name"
              : "Customer name"
          }
          onChange={(e) => setOrgName(e.target.value)}
        />
      </div>
      <RadioGroup value={selectedColor} onChange={setSelectedColor}>
        <RadioGroup.Label className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100">
          Choose a color
        </RadioGroup.Label>
        <div className="mt-4 flex items-center justify-between px-8">
          {ORGANIZATION_COLORS.map((color) => (
            <RadioGroup.Option
              key={color.name}
              value={color}
              className={({ active, checked }) =>
                clsx(
                  color.selectedColor,
                  active && checked ? "ring ring-offset-1" : "",
                  !active && checked ? "ring-2" : "",
                  "relative -m-0.5 flex cursor-pointer items-center justify-center rounded-full p-0.5 focus:outline-none"
                )
              }
            >
              <RadioGroup.Label as="span" className="sr-only">
                {color.name}
              </RadioGroup.Label>
              <span
                aria-hidden="true"
                className={clsx(
                  color.bgColor,
                  "h-8 w-8 rounded-full border border-black dark:border-white border-opacity-10"
                )}
              />
            </RadioGroup.Option>
          ))}
        </div>
      </RadioGroup>
      <RadioGroup value={selectedIcon} onChange={setSelectedIcon}>
        <RadioGroup.Label className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100">
          Choose an icon
        </RadioGroup.Label>
        <div className="mt-4 flex items-center justify-between px-8">
          {ORGANIZATION_ICONS.map((icon) => (
            <RadioGroup.Option
              key={icon.name}
              value={icon}
              className={({ active, checked }) =>
                clsx(
                  checked
                    ? "ring-2 ring-offset-1 ring-sky-300 dark:ring-sky-700"
                    : "ring-1 ring-gray-200 dark:ring-gray-800",
                  "bg-white dark:bg-black rounded-md p-2"
                )
              }
            >
              <RadioGroup.Label as="span" className="sr-only">
                {icon.name}
              </RadioGroup.Label>
              {
                <icon.icon className="h-6 w-6 hover:cursor-pointer text-black dark:text-white" />
              }
            </RadioGroup.Option>
          ))}
        </div>
      </RadioGroup>
      {variant === "reseller" && (
        <div className="flex flex-col space-y-2">
          <label
            htmlFor="org-size"
            className="block text-sm lg:text-md font-medium leading-6 text-gray-900 dark:text-gray-100"
          >
            {
              {
                organization: "How large is your company?",
                reseller: "How large is your customer's company?",
              }[variant]
            }
          </label>
          <div className="">
            <select
              id="org-size"
              name="org-size"
              className="bg-gray-50 dark:bg-gray-950 text-black dark:text-white block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-600 text-sm lg:text-md lg:leading-6"
              required
              onChange={
                variant === "reseller"
                  ? (e) => setOrgSize(e.target.value)
                  : undefined
              }
            >
              {COMPANY_SIZES.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>
      )}
      <div className="border-t border-gray-300 flex justify-end gap-2 pt-8">
        <button
          onClick={() => {
            if (onCancelHandler) {
              onCancelHandler(false);
            } else {
              // reset to the initial values
              setOrgName(initialValues?.name || "");
              setSelectedColor(
                initialValues?.color
                  ? ORGANIZATION_COLORS.find(
                      (c) => c.name === initialValues.color
                    ) || ORGANIZATION_COLORS[0]
                  : ORGANIZATION_COLORS[0]
              );
              setSelectedIcon(
                initialValues?.icon
                  ? ORGANIZATION_ICONS.find(
                      (i) => i.name === initialValues.icon
                    ) || ORGANIZATION_ICONS[0]
                  : ORGANIZATION_ICONS[0]
              );
            }
          }}
          className="flex flex-row items-center rounded-md bg-white dark:bg-black px-4 py-2 text-sm font-semibold border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm hover:text-gray-700 dark:hover:text-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
        >
          Cancel
        </button>
        <button
          onClick={async () => {
            if ((user?.email ?? "") === DEMO_EMAIL) {
              setNotification(
                "Cannot create organization in demo mode",
                "error"
              );
              return;
            }
            if (!orgName || orgName === "") {
              setNotification("Please provide an organization name", "error");
              return;
            }
            if (initialValues) {
              const { data, error } = await supabaseClient
                .from("organization")
                .update({
                  name: orgName,
                  color: selectedColor.name,
                  icon: selectedIcon.name,
                })
                .eq("id", initialValues.id)
                .select("*");
              if (error) {
                setNotification("Failed to update organization", "error");
              } else {
                setNotification("Organization updated successfully", "success");
                onSuccess && onSuccess();
              }
              onCancelHandler && onCancelHandler(false);
              orgContext?.refetchOrgs();
            } else {
              const { data, error } = await supabaseClient
                .from("organization")
                .insert([
                  {
                    name: orgName,
                    owner: user?.id!,
                    color: selectedColor.name,
                    icon: selectedIcon.name,
                    has_onboarded: true,
                    ...(variant === "reseller" && {
                      reseller_id: orgContext?.currentOrg?.id!,
                      size: orgSize,
                      organization_type: "customer",
                    }),
                  },
                ])
                .select("*");
              if (error) {
                setNotification("Failed to create organization", "error");
              } else {
                setNotification("Organization created successfully", "success");
                onSuccess && onSuccess();
              }
              onCancelHandler && onCancelHandler(false);
              orgContext?.refetchOrgs();
            }
          }}
          className="items-center rounded-md bg-black dark:bg-white px-4 py-2 text-sm flex font-semibold text-white dark:text-black shadow-sm hover:bg-gray-800 dark:hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {initialValues ? "Update" : "Create"}
        </button>
      </div>
    </div>
  );
};

export default CreateOrgForm;
