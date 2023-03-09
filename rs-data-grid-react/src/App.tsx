import './App.scss';
import { IColumn } from './components/rsDataGrid/models/rsDataGrid.models';
import { RsDataGrid } from './components/rsDataGrid/rsDataGrid';


function App() {
  const data :any[] = [{name: 'recep', surname: 'sivri'}, {name: 'hatice', surname: 'sivri'}];
  const column: IColumn[] = [{name: 'Name', dataField: 'name'}]
  return (
    <div className="App">
      <RsDataGrid 
      data = {data} 
      column = {column} />
    </div>
  );
}

export default App;
