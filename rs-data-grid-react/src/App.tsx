import './App.scss';
import { IColumn } from './components/rsDataGrid/models/rsDataGrid.models';
import { RsDataGrid } from './components/rsDataGrid/rsDataGrid';

const  returnTemplate = () => {
  return (<div className='deneme'></div>)
}

function App() {
  const data :any[] = [{"state-province": null, "domains": ["marywood.edu"], "country": "United States", "web_pages": ["http://www.marywood.edu"], "name": "Marywood University", "alpha_two_code": "US"}, {"state-province": null, "domains": ["lindenwood.edu"], "country": "United States", "web_pages": ["http://www.lindenwood.edu/"], "name": "Lindenwood University", "alpha_two_code": "US"}, {"state-province": null, "domains": ["sullivan.edu"], "country": "United States", "web_pages": ["https://sullivan.edu/"], "name": "Sullivan University", "alpha_two_code": "US"}, {"state-province": null, "domains": ["fscj.edu"], "country": "United States", "web_pages": ["https://www.fscj.edu/"], "name": "Florida State College at Jacksonville", "alpha_two_code": "US"}, {"state-province": null, "domains": ["xavier.edu"], "country": "United States", "web_pages": ["https://www.xavier.edu/"], "name": "Xavier University", "alpha_two_code": "US"}, {"state-province": null, "domains": ["tusculum.edu"], "country": "United States", "web_pages": ["https://home.tusculum.edu/"], "name": "Tusculum College", "alpha_two_code": "US"}, {"state-province": null, "domains": ["cst.edu"], "country": "United States", "web_pages": ["https://cst.edu/"], "name": "Claremont School of Theology", "alpha_two_code": "US"}, {"state-province": null, "domains": ["columbiasc.edu"], "country": "United States", "web_pages": ["https://www.columbiasc.edu/"], "name": "Columbia College (SC)", "alpha_two_code": "US"}, {"state-province": null, "domains": ["clpccd.edu"], "country": "United States", "web_pages": ["http://www.clpccd.edu/"], "name": "Chabot-Las Positas Community College District", "alpha_two_code": "US"}, {"state-province": null, "domains": ["keller.edu"], "country": "United States", "web_pages": ["https://www.keller.edu/"], "name": "Keller Graduate School of Management", "alpha_two_code": "US"}, {"state-province": null, "domains": ["monroecollege.edu"], "country": "United States", "web_pages": ["https://monroecollege.edu/"], "name": "Monroe College", "alpha_two_code": "US"}, {"state-province": null, "domains": ["smccd.edu"], "country": "United States", "web_pages": ["https://smccd.edu/"], "name": "San Mateo County Community College District", "alpha_two_code": "US"}, {"state-province": null, "domains": ["losrios.edu"], "country": "United States", "web_pages": ["http://losrios.edu/"], "name": "Los Rios Community College District", "alpha_two_code": "US"}, {"state-province": null, "domains": ["digipen.edu"], "country": "United States", "web_pages": ["https://www.digipen.edu/"], "name": "DigiPen Institute of Technology", "alpha_two_code": "US"}, {"state-province": "Pennsylvania", "domains": ["upmc.edu", "upmc.com"], "country": "United States", "web_pages": ["https://www.upmc.com/"], "name": "University of Pittsburgh Medical Center", "alpha_two_code": "US"}];
  const column: IColumn[] = [{name: 'Name', dataField: 'name', customize: {height: '100px', width: '900px'}}, {name: 'Page', dataField: 'web_pages', customize: {height: '100px', width: '1000px'}}, {name: 'Code', dataField: 'alpha_two_code', customize: {height: '100px', template: returnTemplate()}}, {name: 'Country', dataField: 'country', customize: {height: '100px', width: '1200px'}}]
  return (
    <div className="App">
      <RsDataGrid 
      data = {data} 
      column = {column}
     />
    </div>
  );
}

export default App;
