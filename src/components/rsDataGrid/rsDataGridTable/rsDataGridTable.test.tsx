import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { RsDataGridTable } from "./rsDataGridTable";

describe("<RsDataGridTable />", () => {
  test("it should mount", () => {
    render(<RsDataGridTable data={[]} />);

    const rsDataGridTable = screen.getByTestId("RsDataGridTable");

    expect(rsDataGridTable).toBeInTheDocument();
  });
});
