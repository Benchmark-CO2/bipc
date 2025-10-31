import { cn } from "@/lib/utils";

const Icons = {
  beam_column: {
    label: "Pórtico",
    render: (isActive: boolean, onClick: () => void) => (
      <svg
        width="113"
        height="76"
        viewBox="0 0 113 76"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        onClick={onClick}
      >
        <path
          d="M10 0.5H103C108.247 0.5 112.5 4.75329 112.5 10V66C112.5 71.2467 108.247 75.5 103 75.5H10C4.75329 75.5 0.5 71.2467 0.5 66V10C0.5 4.7533 4.7533 0.5 10 0.5Z"
          className={cn(
            "fill-white stroke-transparent transition-colors duration-200",
            {
              "fill-primary": isActive,
            }
          )}
          stroke="#3C3C3B"
        />
        <path
          d="M38.0664 16.5581H28.0684V71.2778H38.0664V16.5581Z"
          fill="#FBFEFE"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M85.5322 16.4629H75.5342V71.1826H85.5322V16.4629Z"
          fill="#FBFEFE"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M39.1384 15.612V19.1677H74.3178V15.612H80.0322V8.80908H33.5376V15.612H39.1384Z"
          fill="#FBFEFE"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M104.733 19.1677V8.80908H81.1138V15.612H86.7187V19.1677H104.733Z"
          fill="#FBFEFE"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M8.83691 19.1677V8.80908H32.4519V15.612H26.8469V19.1677H8.83691Z"
          fill="#FBFEFE"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    ),
  },
  concrete_wall: {
    label: "Parede de concreto",
    render: (isActive: boolean, onClick: () => void) => (
      <svg
        width="113"
        height="76"
        viewBox="0 0 113 76"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        onClick={onClick}
      >
        <path
          d="M103 0H10C4.47715 0 0 4.47715 0 10V66C0 71.5229 4.47715 76 10 76H103C108.523 76 113 71.5229 113 66V10C113 4.47715 108.523 0 103 0Z"
          className={cn(
            "fill-white stroke-transparent transition-colors duration-200",
            {
              "fill-primary": isActive,
            }
          )}
        />
        <path
          d="M91.6994 9.60645H21.2964V68.2024H91.6994V9.60645Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M35.3889 22.7478C35.8304 22.7478 36.1884 22.3981 36.1884 21.9668C36.1884 21.5355 35.8304 21.1858 35.3889 21.1858C34.9473 21.1858 34.5894 21.5355 34.5894 21.9668C34.5894 22.3981 34.9473 22.7478 35.3889 22.7478Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="0.68"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M35.3889 40.5918C35.8304 40.5918 36.1884 40.2421 36.1884 39.8108C36.1884 39.3795 35.8304 39.0298 35.3889 39.0298C34.9473 39.0298 34.5894 39.3795 34.5894 39.8108C34.5894 40.2421 34.9473 40.5918 35.3889 40.5918Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="0.68"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M35.3889 58.4397C35.8304 58.4397 36.1884 58.09 36.1884 57.6587C36.1884 57.2274 35.8304 56.8777 35.3889 56.8777C34.9473 56.8777 34.5894 57.2274 34.5894 57.6587C34.5894 58.09 34.9473 58.4397 35.3889 58.4397Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="0.68"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M55.7004 22.7478C56.142 22.7478 56.4999 22.3981 56.4999 21.9668C56.4999 21.5355 56.142 21.1858 55.7004 21.1858C55.2588 21.1858 54.9009 21.5355 54.9009 21.9668C54.9009 22.3981 55.2588 22.7478 55.7004 22.7478Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="0.68"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M55.7004 40.5918C56.142 40.5918 56.4999 40.2421 56.4999 39.8108C56.4999 39.3795 56.142 39.0298 55.7004 39.0298C55.2588 39.0298 54.9009 39.3795 54.9009 39.8108C54.9009 40.2421 55.2588 40.5918 55.7004 40.5918Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="0.68"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M55.7004 58.4397C56.142 58.4397 56.4999 58.09 56.4999 57.6587C56.4999 57.2274 56.142 56.8777 55.7004 56.8777C55.2588 56.8777 54.9009 57.2274 54.9009 57.6587C54.9009 58.09 55.2588 58.4397 55.7004 58.4397Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="0.68"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M76.0124 22.7478C76.4539 22.7478 76.8119 22.3981 76.8119 21.9668C76.8119 21.5355 76.4539 21.1858 76.0124 21.1858C75.5708 21.1858 75.2129 21.5355 75.2129 21.9668C75.2129 22.3981 75.5708 22.7478 76.0124 22.7478Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="0.68"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M76.0124 40.5918C76.4539 40.5918 76.8119 40.2421 76.8119 39.8108C76.8119 39.3795 76.4539 39.0298 76.0124 39.0298C75.5708 39.0298 75.2129 39.3795 75.2129 39.8108C75.2129 40.2421 75.5708 40.5918 76.0124 40.5918Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="0.68"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M76.0124 58.4397C76.4539 58.4397 76.8119 58.09 76.8119 57.6587C76.8119 57.2274 76.4539 56.8777 76.0124 56.8777C75.5708 56.8777 75.2129 57.2274 75.2129 57.6587C75.2129 58.09 75.5708 58.4397 76.0124 58.4397Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="0.68"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    ),
  },
  structural_masonry: {
    label: "Alvenaria estrutural",
    render: (isActive: boolean, onClick: () => void) => (
      <svg
        width="114"
        height="76"
        viewBox="0 0 114 76"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        onClick={onClick}
      >
        <path
          d="M104 0H10C4.47715 0 0 4.47715 0 10V66C0 71.5229 4.47716 76 10 76H104C109.523 76 114 71.5229 114 66V10C114 4.47715 109.523 0 104 0Z"
          className={cn(
            "fill-white stroke-transparent transition-colors duration-200",
            {
              "fill-primary": isActive,
            }
          )}
        />
        <path
          d="M40.1553 68.2025V58.4358H22.3977V68.2025H40.1553Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M49.0322 58.44V48.6733H31.2747V58.44H49.0322Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M66.7896 58.44V48.6733H49.032V58.44H66.7896Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M84.5474 58.4359V48.6692H66.7898V58.4359H84.5474Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M93.4238 58.4359V48.6692H84.5472V58.4359H93.4238Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M31.2744 58.44V48.6733H22.3977V58.44H31.2744Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M57.9126 68.2025V58.4358H40.155V68.2025H57.9126Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M75.666 68.2064V58.4397H57.9084V68.2064H75.666Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M93.4238 68.2064V58.4397H75.6662V68.2064H93.4238Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M40.1553 48.6729V38.9062H22.3977V48.6729H40.1553Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M49.0322 38.9061V29.1394H31.2746V38.9061H49.0322Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M66.7852 38.9061V29.1394H49.0276V38.9061H66.7852Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M84.543 38.9061V29.1394H66.7854V38.9061H84.543Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M93.4238 38.9061V29.1394H84.5472V38.9061H93.4238Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M31.2783 38.9061V29.1394H22.4017V38.9061H31.2783Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M57.9126 48.6729V38.9062H40.155V48.6729H57.9126Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M75.6704 48.6729V38.9062H57.9128V48.6729H75.6704Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M93.4238 48.6729V38.9062H75.6662V48.6729H93.4238Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M40.1509 29.1397V19.373H22.3933V29.1397H40.1509Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M49.0322 19.3775V9.61084L31.2747 9.61084V19.3775H49.0322Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M66.7896 19.3775V9.61084L49.032 9.61084V19.3775H66.7896Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M84.5474 19.3731V9.60645L66.7898 9.60645V19.3731H84.5474Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M93.4238 19.3731V9.60645H84.5472V19.3731H93.4238Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M31.2744 19.3775V9.61084H22.3977V19.3775H31.2744Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M57.9087 29.1397V19.373H40.1511V29.1397H57.9087Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M75.666 29.1397V19.373H57.9084V29.1397H75.666Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M93.4238 29.1397V19.373H75.6662V29.1397H93.4238Z"
          fill="white"
          stroke="#3C3C3B"
          stroke-width="1.36"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    ),
  },
};

type IconProps = {
  name: keyof typeof Icons;
  isActive?: boolean;
} & React.SVGProps<SVGSVGElement>;

export const TechIcon = ({
  name,
  isActive = false,
  onClick,
}: IconProps & { onClick: () => void }) => {
  const IconComponent = Icons[name]
    ? Icons[name].render(isActive, onClick)
    : null;
  return (
    <div className="flex flex-col items-center gap-2 cursor-pointer select-none">
      {IconComponent}
      <span className="text-center text-primary text-xs">
        {Icons[name]?.label}
      </span>
    </div>
  );
};
