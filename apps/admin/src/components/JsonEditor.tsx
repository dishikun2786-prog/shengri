import { useState, useEffect, useRef } from 'react';
import { useInput } from 'react-admin';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

interface JsonEditorProps {
  source: string;
  label?: string;
}

const JsonEditor = ({ source, label }: JsonEditorProps) => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const {
    field,
    fieldState: { error },
  } = useInput({ source });

  const [text, setText] = useState('');
  const [parseError, setParseError] = useState('');
  const userEditing = useRef(false);

  useEffect(() => {
    if (userEditing.current) return;
    try {
      const serialized = JSON.stringify(field.value, null, 2);
      if (serialized !== text) setText(serialized);
    } catch {
      const fallback = String(field.value || '');
      if (fallback !== text) setText(fallback);
    }
  }, [field.value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    userEditing.current = true;
    const val = e.target.value;
    setText(val);
    try {
      const parsed = JSON.parse(val);
      field.onChange(parsed);
      setParseError('');
    } catch (err: any) {
      setParseError(err.message);
    }
  };

  const handleBlur = () => {
    userEditing.current = false;
  };

  return (
    <Box sx={{ width: '100%' }}>
      <TextField
        label={label || source}
        multiline
        minRows={isSmall ? 4 : 8}
        maxRows={20}
        fullWidth
        value={text}
        onChange={handleChange}
        onBlur={handleBlur}
        error={!!parseError || !!error}
        helperText={parseError || (error ? error.message : '')}
        sx={{
          '& .MuiInputBase-input': {
            fontFamily: '"Fira Code", "Consolas", monospace',
            fontSize: isSmall ? '0.75rem' : '0.85rem',
            lineHeight: 1.6,
          },
        }}
      />
      {parseError && (
        <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
          JSON 格式错误: {parseError}
        </Typography>
      )}
    </Box>
  );
};

export default JsonEditor;
