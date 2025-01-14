import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { RsDataGridPager } from "./rsDataGridPager";

describe("<RsDataGridTable />", () => {
  test("it should mount", () => {
    render(<RsDataGridPager />);

    const rsDataGridTable = screen.getByTestId("RsDataGridTable");

    expect(rsDataGridTable).toBeInTheDocument();
  });
});
