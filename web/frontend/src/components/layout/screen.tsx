import React from "react";

interface IScreen {
  children: React.ReactNode;
}
const Screen = ({ children }: IScreen) => {
  return (
    <main
      className={`h-full w-full overflow-auto relative flex flex-col pb-12`}
    >
      {children}
    </main>
  );
};

export default Screen;
