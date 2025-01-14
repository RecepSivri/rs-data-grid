import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { RsDataGridHeader } from "./rsDataGridHeader";

describe("<RsDataGridTable />", () => {
  test("it should mount", () => {
    render(<RsDataGridHeader data={[]} />);

    const rsDataGridHeader = screen.getByTestId("RsDataGridHeader");

    expect(rsDataGridHeader).toBeInTheDocument();
  });
});
