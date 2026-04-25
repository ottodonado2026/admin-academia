import { useEffect } from 'react'
import AppRouter from "./router/AppRouter";
import { supabase } from './services/supabaseClient'

function App() {

  useEffect(() => {
    console.log("USE EFFECT CORRIENDO")
   
    const testSupabase = async () => {
      const { data, error } = await supabase
        .from('test')
        .select('*')

      console.log('DATA:', data)
      console.log('ERROR:', error)
    }

    testSupabase()
  }, [])

  return <AppRouter />;
}

export default App;