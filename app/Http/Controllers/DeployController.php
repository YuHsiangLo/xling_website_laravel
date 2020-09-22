<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class DeployController extends Controller
{
    /**
     * Create a new controller instance.
     *
     * @return void
     */
    public function __construct()
    {
        $this->middleware('auth');
    }

    public function deploy(Request $request)
    {
        $root_path = base_path();
        $process = new Process('cd ' . $root_path . '; sh ./deploy.sh');
        $process->run(function ($type, $buffer) {
            echo $buffer;
        });
    }
}
