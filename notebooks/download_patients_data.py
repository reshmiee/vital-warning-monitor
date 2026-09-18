import vitaldb
import pandas as pd
import sys
selected_cases = [1, 4, 5, 7, 10]
tracks = [
    'Solar8000/HR',
    'Solar8000/PLETH_SPO2',
    'Solar8000/ART_SBP',
    'Solar8000/RR_CO2',
    'Solar8000/BT'
]
combined = []
for cid in selected_cases:
    print(f"Downloading Case {cid}...", flush=True)
    vf = vitaldb.VitalFile(cid)
    df = vf.to_pandas(tracks, interval=60)
    df.columns = ['PulseRate', 'SpO2', 'SystolicBP', 'RespRate', 'Temperature']
    
    # Filter plausible physiological values
    clean = df[
        (df['SystolicBP'] > 40) & (df['SystolicBP'] < 300) &
        (df['PulseRate'] > 30) & (df['PulseRate'] < 250) &
        (df['SpO2'] > 50) & (df['SpO2'] <= 100) &
        (df['RespRate'] > 3) & (df['RespRate'] < 60) &
        (df['Temperature'] > 25) & (df['Temperature'] < 43)
    ].copy()
    
    clean.reset_index(drop=True, inplace=True)
    clean.index.name = 'Minute'
    
    filename = f"patient_case_{cid}_vitals.csv"
    clean.to_csv(filename)
    print(f"Saved {filename} with {len(clean)} minutes.", flush=True)
    
    clean_with_id = clean.reset_index()
    clean_with_id.insert(0, 'PatientCaseID', cid)
    combined.append(clean_with_id)
all_df = pd.concat(combined, ignore_index=True)
all_df.to_csv("combined_5_patients_vitals.csv", index=False)
print(f"All done! Saved combined_5_patients_vitals.csv with {len(all_df)} total rows.", flush=True)