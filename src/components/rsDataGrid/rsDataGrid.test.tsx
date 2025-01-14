import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { RsDataGrid } from "./rsDataGrid";

describe("<RsDataGrid />", () => {
  test("it should mount", () => {
    render(<RsDataGrid data={[]} />);

    const rsDataGrid = screen.getByTestId("RsDataGrid");

    expect(rsDataGrid).toBeInTheDocument();
  });
});
