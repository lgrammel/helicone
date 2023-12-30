import { useSupabaseClient } from "@supabase/auth-helpers-react";
import {
  Badge,
  Button,
  Card,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  TextInput,
} from "@tremor/react";
import { useOrg } from "../../../shared/layout/organizationContext";
import { useQuery } from "@tanstack/react-query";
import { Database } from "../../../../supabase/database.types";
import {
  BuildingStorefrontIcon,
  ChartPieIcon,
  EllipsisHorizontalIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { Menu, Transition } from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "../../../shared/clsx";
import { getUSDateFromString } from "../../../shared/utils/utils";
import CustomerRow from "./customerRow";
import { ArrowRightIcon } from "@heroicons/react/20/solid";
import { useRouter } from "next/router";
import { set } from "date-fns";
import { useDebounce } from "../../../../services/hooks/debounce";

interface PortalPageProps {
  searchQuery: string | null;
}

const PortalPage = (props: PortalPageProps) => {
  const { searchQuery } = props;

  const supabase = useSupabaseClient();

  const org = useOrg();
  const router = useRouter();
  const [currentSearch, setCurrentSearch] = useState<string | null>(null);

  const debouncedSearch = useDebounce(currentSearch, 700);

  const { data, isLoading, refetch } = useQuery<
    Database["public"]["Tables"]["organization"]["Row"][]
  >(["orgs", org?.currentOrg.id, debouncedSearch], async (query) => {
    const orgId = query.queryKey[1];
    const newSearch = query.queryKey[2];
    if (newSearch) {
      const { data, error } = await supabase
        .from("organization")
        .select("*")
        .eq("reseller_id", orgId)
        .ilike("name", `%${newSearch}%`);

      if (error) {
        return [];
      }

      return data as Database["public"]["Tables"]["organization"]["Row"][];
    } else {
      const { data, error } = await supabase
        .from("organization")
        .select("*")
        .eq("reseller_id", orgId);

      if (error) {
        return [];
      }

      return data as Database["public"]["Tables"]["organization"]["Row"][];
    }
  });

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-row items-center justify-between">
        <h1 className="font-semibold text-3xl text-black dark:text-white">
          Customer Portal
        </h1>
        <button
          onClick={() => {}}
          className="items-center rounded-md bg-black dark:bg-white px-4 py-2 text-sm flex font-semibold text-white dark:text-black shadow-sm hover:bg-gray-800 dark:hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Customer
        </button>
      </div>
      <TabGroup>
        <TabList className="font-semibold" variant="line">
          <Tab>Customers</Tab>
          <Tab>Analytics</Tab>
          <Tab>Branding</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <div className="flex flex-col mt-8">
              <div className="flex flex-row justify-between items-center mb-4">
                <TextInput
                  icon={MagnifyingGlassIcon}
                  placeholder="Search Customer Name..."
                  className="max-w-sm"
                  onChange={(e) => {
                    // add this into query params as search
                    const search = e.target.value as string;

                    setCurrentSearch(search);

                    if (search === "") {
                      // delete the query param from the url
                      delete router.query.q;
                      router.push({
                        pathname: router.pathname,
                        query: { ...router.query },
                      });
                      refetch();
                      return;
                    }

                    router.push({
                      pathname: router.pathname,
                      query: { ...router.query, q: search },
                    });
                    refetch();
                  }}
                />
              </div>
              {isLoading ? (
                <div>Loading...</div>
              ) : data?.length === 0 ? (
                <div className="flex flex-col w-full h-96 justify-center items-center">
                  <div className="flex flex-col w-2/5">
                    <UserGroupIcon className="h-12 w-12 text-gray-900 dark:tex-gray-100 border border-gray-300 dark:border-gray-700 bg-white dark:bg-black p-2 rounded-lg" />
                    <p className="text-xl text-black dark:text-white font-semibold mt-8">
                      No customers exist!
                    </p>
                    <p className="text-sm text-gray-500 max-w-sm mt-2">
                      Create a new customer to get started or reach out to our
                      support team for help getting started.
                    </p>
                    <div className="flex flex-row items-center justify-between mt-2">
                      <a
                        href="mailto:engineering@helicone.ai"
                        className="font-semibold text-blue-500 underline text-xs flex items-center space-x-1"
                      >
                        Contact Support
                        <ArrowRightIcon className="h-3 w-3 inline" />
                      </a>
                    </div>
                    <div className="flex flex-row items-center justify-between mt-8">
                      <button
                        onClick={() => {}}
                        className="items-center rounded-md bg-black dark:bg-white px-2 py-1 text-xs flex font-semibold text-white dark:text-black shadow-sm hover:bg-gray-800 dark:hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Add Customer
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col w-full space-y-4">
                  <Card>
                    <Table className="overflow-auto lg:overflow-visible">
                      <TableHead className="border-b border-gray-300 dark:border-gray-700 ">
                        <TableRow>
                          <TableHeaderCell className="w-8"></TableHeaderCell>
                          <TableHeaderCell className="text-black">
                            Name
                          </TableHeaderCell>
                          <TableHeaderCell className="text-black">
                            Created At
                          </TableHeaderCell>
                          <TableHeaderCell className="text-black">
                            Status
                          </TableHeaderCell>
                          <TableHeaderCell className="text-black">
                            Members
                          </TableHeaderCell>
                          <TableHeaderCell className="text-black">
                            Requests (30 days)
                          </TableHeaderCell>
                          <TableHeaderCell></TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data?.map((org, index) => (
                          <CustomerRow org={org} key={index} />
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </div>
              )}
            </div>
          </TabPanel>
          <TabPanel>
            <div className="flex flex-col w-full h-96 justify-center items-center">
              <div className="flex flex-col w-2/5">
                <ChartPieIcon className="h-12 w-12 text-black dark:text-white border border-gray-300 dark:border-gray-700 bg-white dark:bg-black p-2 rounded-lg" />
                <p className="text-xl text-black dark:text-white font-semibold mt-8">
                  Analytics coming soon!
                </p>
                <p className="text-sm text-gray-500 max-w-sm mt-2">
                  You will soon be able to get an understanding of how your
                  customers are using your product and how you can improve their
                  experience.
                </p>
              </div>
            </div>
          </TabPanel>
          <TabPanel>
            <div className="flex flex-col w-full h-96 justify-center items-center">
              <div className="flex flex-col w-2/5">
                <BuildingStorefrontIcon className="h-12 w-12 text-black dark:text-white border border-gray-300 dark:border-gray-700 bg-white dark:bg-black p-2 rounded-lg" />
                <p className="text-xl text-black dark:text-white font-semibold mt-8">
                  Branding coming soon!
                </p>
                <p className="text-sm text-gray-500 max-w-sm mt-2">
                  Customize your branding and make your portal your own. Your
                  customers will be able to see your logo and colors along with
                  your own domain.
                </p>
              </div>
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
};

export default PortalPage;