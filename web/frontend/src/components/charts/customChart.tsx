/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import {
  ReferenceLine,
  Scatter,
  ScatterChart,
  ScatterProps,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DataPoint } from "./mock";

interface IProps {
  cx: number | string;
  cy: number | string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  payload?: {
    fill: boolean;
    label: string;
    isGlobal?: boolean;
    fillColor?: string;
  };
}

interface IChartProps {
  data?: {
    x: number;
    y: number;
    fill: boolean;
    label?: string;
  }[];
  maxHeight?: number;
  maxWidth?: number;
  filledPoints?: number;
  datachart?: Record<string, DataPoint[]>;
  globalData?: {
    green: DataPoint[];
    grey: DataPoint[];
  };
}

const Loader = ({ width, height }: { width: number; height: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={width / 10}
    height={height / 10}
    viewBox="0 0 24 24"
  >
    <rect width="10" height="10" x="1" y="1" className="fill-amber-600" rx="1">
      <animate
        id="svgSpinnersBlocksShuffle30"
        fill="freeze"
        attributeName="x"
        begin="0;svgSpinnersBlocksShuffle3b.end"
        dur="0.2s"
        values="1;13"
      />
      <animate
        id="svgSpinnersBlocksShuffle31"
        fill="freeze"
        attributeName="y"
        begin="svgSpinnersBlocksShuffle38.end"
        dur="0.2s"
        values="1;13"
      />
      <animate
        id="svgSpinnersBlocksShuffle32"
        fill="freeze"
        attributeName="x"
        begin="svgSpinnersBlocksShuffle39.end"
        dur="0.2s"
        values="13;1"
      />
      <animate
        id="svgSpinnersBlocksShuffle33"
        fill="freeze"
        attributeName="y"
        begin="svgSpinnersBlocksShuffle3a.end"
        dur="0.2s"
        values="13;1"
      />
    </rect>
    <rect width="10" height="10" x="1" y="13" className="fill-amber-600" rx="1">
      <animate
        id="svgSpinnersBlocksShuffle34"
        fill="freeze"
        attributeName="y"
        begin="svgSpinnersBlocksShuffle30.end"
        dur="0.2s"
        values="13;1"
      />
      <animate
        id="svgSpinnersBlocksShuffle35"
        fill="freeze"
        attributeName="x"
        begin="svgSpinnersBlocksShuffle31.end"
        dur="0.2s"
        values="1;13"
      />
      <animate
        id="svgSpinnersBlocksShuffle36"
        fill="freeze"
        attributeName="y"
        begin="svgSpinnersBlocksShuffle32.end"
        dur="0.2s"
        values="1;13"
      />
      <animate
        id="svgSpinnersBlocksShuffle37"
        fill="freeze"
        attributeName="x"
        begin="svgSpinnersBlocksShuffle33.end"
        dur="0.2s"
        values="13;1"
      />
    </rect>
    <rect
      width="10"
      height="10"
      x="13"
      y="13"
      className="fill-amber-600"
      rx="1"
    >
      <animate
        id="svgSpinnersBlocksShuffle38"
        fill="freeze"
        attributeName="x"
        begin="svgSpinnersBlocksShuffle34.end"
        dur="0.2s"
        values="13;1"
      />
      <animate
        id="svgSpinnersBlocksShuffle39"
        fill="freeze"
        attributeName="y"
        begin="svgSpinnersBlocksShuffle35.end"
        dur="0.2s"
        values="13;1"
      />
      <animate
        id="svgSpinnersBlocksShuffle3a"
        fill="freeze"
        attributeName="x"
        begin="svgSpinnersBlocksShuffle36.end"
        dur="0.2s"
        values="1;13"
      />
      <animate
        id="svgSpinnersBlocksShuffle3b"
        fill="freeze"
        attributeName="y"
        begin="svgSpinnersBlocksShuffle37.end"
        dur="0.2s"
        values="1;13"
      />
    </rect>
  </svg>
);
function CustomChart({
  maxHeight,
  maxWidth,
  filledPoints,
  datachart,
  globalData,
}: IChartProps) {
  const [width, setWidth] = useState(window.innerWidth);
  const [height, setHeight] = useState(window.innerHeight);

  const [referenceLines2, setReferenceLines] = useState<any[]>([]);
  const [greenData, setGreenData] = useState<DataPoint[]>([]);
  const [greyData, setGreyData] = useState<DataPoint[]>([]);

  const [isMobileOrTable, setIsMobileOrTablet] = useState(false);

  const [dataLoading, setDataLoading] = useState(true);

  const maxX = Math.max(...greenData.map((item) => item.x));

  const startLoading = () => {
    setTimeout(() => {
      setDataLoading(false);
    }, 2000);
  };

  useEffect(() => {
    // if (datachart) {
    //   setGreenData(datachart.green.sort((a, b) => a.x - b.x));
    //   setGreyData(datachart.grey.sort((a, b) => a.x - b.x));
    // }
    startLoading();
  }, [datachart]);

  useEffect(() => {
    const tempLines = greyData
      .map((item, idx) => {
        if (item.fill) {
          const forwardItem = greyData
            .slice(idx + 1, greyData.length)
            .find((item) => item.fill);
          const temp = {
            y1: greenData[idx].y,
            x1: greenData[idx].x,
            y2: item.y,
            x2: item.x,
            width: forwardItem ? forwardItem.x - item.x : 0,
            height: forwardItem ? forwardItem.y - item.y : 0,
            status: item.fill,
            version: "v" + idx,
          };

          return temp;
        }
        return {
          y1: item.y,
          y2: item.y,
          x1: item.x,
          x2: item.x,
          width: 0,
          height: 0,
          version: 0,
          status: false,
        };
      })
      .filter((item) => item.status === true);

    setReferenceLines(tempLines);
  }, [greenData, greyData]);

  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth);
      setHeight(window.innerHeight);
      setIsMobileOrTablet(window.innerWidth <= 1280);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    setIsMobileOrTablet(window.innerWidth <= 1280);
  }, []);

  const widthValue = isMobileOrTable ? width * 0.7 : width * 0.35;
  const heightValue = isMobileOrTable ? height * 0.4 : height * 0.5;

  const scatters =
    datachart &&
    Object.keys(datachart)?.map((item) => {
      const serieName = item;
      const data = (datachart as any)[item] as DataPoint[];
      return (
        <Scatter
          name={serieName}
          data={!dataLoading ? data : []}
          shape={(props: ScatterProps["shape"]) => {
            const { cx, cy, payload } = props as IProps;
            return (
              <g key={item}>
                <circle
                  cx={cx as number}
                  cy={cy as number}
                  r={6}
                  data-isglobal={payload?.isGlobal ? payload.isGlobal : false}
                  data-filled={payload?.fill && !payload.isGlobal}
                  style={{
                    fill: payload?.fillColor
                      ? payload.fillColor
                      : payload?.fill
                        ? "#4CAF50"
                        : "#2C1D1B",
                  }}
                  className={cn(
                    "fill-zinc-700 dark:fill-zinc-200 dark:data-[key=not-filled]:fill-zinc-400 data-[isglobal=true]:fill-accent-foreground/70 data-[isglobal=false]:stroke-1!"
                  )}
                />
                <text
                  x={(cx as number) - 20}
                  y={(cy as number) - 10}
                  dominantBaseline="top"
                  fontSize={16}
                  fill="#000000"
                  className="stroke-black stroke-[0.5px]"
                >
                  {payload?.label ? payload.label : ""}
                </text>
              </g>
            );
          }}
          className="stroke-[1px]"
          line={{ stroke: "#000000" }}
          // lineJointType={'natural'}
        />
      );
    });
  return (
    <div className="flex h-full items-center justify-center p-2 border-4 border-sidebar rounded-sm">
      <div className="rounded-lg p-8 shadow-lg relative bg-white">
        {dataLoading && (
          <div
            style={{
              top: (maxHeight ?? heightValue) / 2,
              left: (maxWidth ?? widthValue) / 1.8,
            }}
            className="absolute z-10 text-sm text-gray-500 dark:text-gray-400"
          >
            <Loader
              width={maxWidth ?? widthValue}
              height={maxHeight ?? heightValue}
            />
          </div>
        )}
        <ScatterChart
          throttleDelay={1000}
          width={maxWidth ?? widthValue}
          height={maxHeight ?? heightValue}
          margin={
            isMobileOrTable
              ? { top: 20, right: 20, bottom: 20, left: 20 }
              : { top: 20, right: 50, bottom: 20, left: 50 }
          }
          className="transition-all"
        >
          <XAxis
            type="number"
            dataKey="x"
            name="CO2"
            domain={[0, filledPoints ? maxX : 100]}
            className="stroke-black"
            tick={{ fontSize: 12, stroke: 'black' }}
            label={{
              value: "Carbono incorporado (kg CO2/m²)",
              position: "bottom",
            }}
          />
          <YAxis
            type="number"
            domain={[0, 1]}
            dataKey="y"
            name="Cumulative"
            className="stroke-black"
            tick={{ fontSize: 12, stroke: 'black' }}
            label={{
              value: "Cumulativo",
              angle: -90,
              position: "left",
              props: { className: "font-bold" },
            }}
          />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          {scatters}
          
          {!dataLoading &&
            referenceLines2.map((line, index) => (
              <g key={index}>
                <ReferenceLine
                  key={index}
                  segment={[
                    { x: line.x1, y: line.y1 },
                    { x: line.x2 + line.width, y: line.y2 },
                  ]}
                  stroke="red"
                  strokeDasharray="5 5"
                  width={line.width}
                />
                <ReferenceLine
                  key={index * referenceLines2.length + 1}
                  segment={[
                    { x: line.x2 + line.width, y: line.y2 + line.height },
                    { x: line.x2 + line.width, y: line.y2 },
                  ]}
                  stroke="green"
                  strokeDasharray="5 5"
                  width={line.height}
                />
              </g>
            ))}
        </ScatterChart>
      </div>
    </div>
  );
}

export default CustomChart;
