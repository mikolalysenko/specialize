var arg_inline_arg_root_0_0,arg_inline_arg_root_1_0,arg_inline_arg_root_2_0,arg_inline_arg_root_3_0,arg_inline_arg_root_3_1,return_inline_arg_root_0_val,return_inline_arg_root_1_val,return_inline_arg_root_2_val,return_inline_arg_root_3_val,return_root_val,root_i,root_y,scratch_inline_arg_root_0_0,scratch_inline_arg_root_0_1,scratch_inline_arg_root_0_2,scratch_inline_arg_root_0_3,scratch_inline_arg_root_0_4,scratch_inline_arg_root_1_0,scratch_inline_arg_root_2_0,scratch_inline_arg_root_3_0
{{{{

label_root_body: do {
  root_y=(0)
  do{
    arg_inline_arg_root_0_0=arg_root_4
  label_inline_arg_root_0_body: do { {return_inline_arg_root_0_val=(arg_inline_arg_root_0_0 + 1); break label_inline_arg_root_0_body;}
  } while(0)
    root_i=return_inline_arg_root_0_val
    scratch_inline_arg_root_0_1=root_i
    while(1) {
      scratch_inline_arg_root_0_2=root_i
      {arg_inline_arg_root_1_0=scratch_inline_arg_root_0_2
      label_inline_arg_root_1_body: do { {return_inline_arg_root_1_val=(arg_inline_arg_root_1_0 < 100); break label_inline_arg_root_1_body;}
      } while(0)
        scratch_inline_arg_root_0_0=return_inline_arg_root_1_val
        scratch_inline_arg_root_1_0=scratch_inline_arg_root_0_0};if(scratch_inline_arg_root_0_0) { break; }
      {
        {arg_inline_arg_root_3_0=root_i
          arg_inline_arg_root_3_1=root_y
        label_inline_arg_root_3_body: do { {return_inline_arg_root_3_val=(arg_inline_arg_root_3_0 * arg_inline_arg_root_3_1 + 1); break label_inline_arg_root_3_body;}
        } while(0)
          root_y=return_inline_arg_root_3_val
          scratch_inline_arg_root_3_0=root_y};}
      scratch_inline_arg_root_0_4=root_i
      {arg_inline_arg_root_2_0=scratch_inline_arg_root_0_4
      label_inline_arg_root_2_body: do { {return_inline_arg_root_2_val=(arg_inline_arg_root_2_0 + 5); break label_inline_arg_root_2_body;}
      } while(0)
        root_i=return_inline_arg_root_2_val
        scratch_inline_arg_root_2_0=root_i};scratch_inline_arg_root_0_3=root_i
    }
  } while(0);
  {return_root_val=(root_y  + arg_root_4); break label_root_body;}
} while(0)

}}}}